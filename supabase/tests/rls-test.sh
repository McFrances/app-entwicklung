#!/bin/bash
# Prüft den Zugriffsschutz (Row Level Security) der Migration mit zwei Nutzern (A, B) und
# einem nicht angemeldeten Besucher (anon). Jeder Zugriff auf fremde Daten muss scheitern.
#
# Läuft gegen eine LOKALE Test-Datenbank, nicht gegen Supabase (das Skript leert Tabellen!):
#   createdb post_test
#   psql -d post_test -f supabase/tests/supabase-stub.sql                       # baut Supabase-Rollen/auth/storage nach
#   psql -d post_test -f supabase/migrations/20261124000000_init.sql
#   PGDATABASE=post_test bash supabase/tests/rls-test.sh
# Verbindung über die üblichen Variablen PGHOST, PGPORT, PGUSER, PGDATABASE.
A=aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa
B=bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb
SU="psql -t -A -v ON_ERROR_STOP=1"
pass=0; fail=0
# run <rolle> <uid|-> <sql>  -> gibt Ausgabe + Fehlertext zurück
run() { local role=$1 uid=$2 sql=$3
  local pre="set role $role;"; [ "$uid" != "-" ] && pre="$pre select set_config('request.jwt.claim.sub','$uid',false);"
  $SU -c "$pre $sql" 2>&1 | grep -v -x -e '' -e 'SET' -e "$uid" ; }
ok()   { # name, haystack, needle
  if echo "$2" | grep -q -- "$3"; then pass=$((pass+1)); echo "  ✓ $1"; else fail=$((fail+1)); echo "  ✗ $1  (erwartet: $3, bekommen: $2)"; fi; }

$SU -q -c "reset role; truncate public.vorgang cascade; truncate storage.objects; truncate auth.users cascade;
        insert into auth.users(id,email) values ('$A','a@x.de'),('$B','b@x.de');" >/dev/null

echo "vorgang"
V=$(run authenticated $A "insert into public.vorgang(absender,kategorie,zusammenfassung_einfach,folgen_bei_nichtstun,dringlichkeit,frist) values ('Stadtwerke','Rechnung','x','y','mittel','2026-12-15') returning id;" | head -1 | tr -d ' ')
ok "A legt Vorgang an (nutzer_id wird automatisch gesetzt)" "$($SU -c "select nutzer_id from public.vorgang where id='$V'")" "$A"
VB=$(run authenticated $B "insert into public.vorgang(absender,kategorie,zusammenfassung_einfach,folgen_bei_nichtstun,dringlichkeit) values ('Bank','Bank','x','y','niedrig') returning id;" | head -1 | tr -d ' ')
ok "A sieht genau 1 Vorgang (den eigenen)" "$(run authenticated $A 'select count(*) from public.vorgang;')" "^1$"
ok "B sieht genau 1 Vorgang (den eigenen)" "$(run authenticated $B 'select count(*) from public.vorgang;')" "^1$"
ok "B kann Vorgang von A nicht lesen" "$(run authenticated $B "select count(*) from public.vorgang where id='$V';")" "^0$"
ok "B kann Vorgang von A nicht ändern" "$(run authenticated $B "update public.vorgang set status='erledigt' where id='$V';")" "UPDATE 0"
ok "B kann Vorgang von A nicht löschen" "$(run authenticated $B "delete from public.vorgang where id='$V';")" "DELETE 0"
ok "B kann keinen Vorgang für A anlegen" "$(run authenticated $B "insert into public.vorgang(nutzer_id,absender,kategorie,zusammenfassung_einfach,folgen_bei_nichtstun,dringlichkeit) values ('$A','x','x','x','x','hoch');")" "row-level security"
ok "A kann Vorgang nicht an B verschenken" "$(run authenticated $A "update public.vorgang set nutzer_id='$B' where id='$V';")" "row-level security"
ok "Nicht angemeldet (anon) hat keinen Zugriff" "$(run anon - 'select * from public.vorgang;')" "permission denied"
ok "Ungültiger Status wird abgelehnt" "$(run authenticated $A "update public.vorgang set status='kaputt' where id='$V';")" "invalid input value"
ok "A darf Status ändern" "$(run authenticated $A "update public.vorgang set status='in_arbeit' where id='$V';")" "UPDATE 1"
ok "aktualisiert_am wird per Trigger gesetzt" "$($SU -c "select aktualisiert_am > erstellt_am from public.vorgang where id='$V'")" "^t$"

echo "dokument"
ok "A legt Dokument zu eigenem Vorgang an" "$(run authenticated $A "insert into public.dokument(vorgang_id,seite,speicherpfad,dateiname,mime_typ,groesse_bytes) values ('$V',1,'$A/$V/1.jpg','a.jpg','image/jpeg',100);")" "INSERT 0 1"
ok "B kann Dokument nicht zu Vorgang von A anlegen" "$(run authenticated $B "insert into public.dokument(vorgang_id,seite,speicherpfad,dateiname,mime_typ,groesse_bytes) values ('$V',2,'$B/$V/2.jpg','a.jpg','image/jpeg',100);")" "row-level security"
ok "B kann Dokument nicht als A anlegen" "$(run authenticated $B "insert into public.dokument(nutzer_id,vorgang_id,seite,speicherpfad,dateiname,mime_typ,groesse_bytes) values ('$A','$V',3,'$A/$V/3.jpg','a.jpg','image/jpeg',100);")" "row-level security"
ok "Pfad im fremden Ordner wird abgelehnt" "$(run authenticated $A "insert into public.dokument(vorgang_id,seite,speicherpfad,dateiname,mime_typ,groesse_bytes) values ('$V',4,'$B/$V/4.jpg','a.jpg','image/jpeg',100);")" "violates check constraint"
ok "B sieht keine Dokumente von A" "$(run authenticated $B 'select count(*) from public.dokument;')" "^0$"
ok "A kann Dokument nicht in Vorgang von B verschieben" "$(run authenticated $A "update public.dokument set vorgang_id='$VB' where vorgang_id='$V';")" "row-level security"
ok "anon sieht keine Dokumente" "$(run anon - 'select * from public.dokument;')" "permission denied"

echo "erinnerung"
ok "A legt Erinnerung an" "$(run authenticated $A "insert into public.erinnerung(vorgang_id,erinnerung_am,nachricht) values ('$V','2026-12-12 09:00+01','Überweisung');")" "INSERT 0 1"
ok "B kann keine Erinnerung zu Vorgang von A anlegen" "$(run authenticated $B "insert into public.erinnerung(vorgang_id,erinnerung_am) values ('$V',now());")" "row-level security"
ok "B sieht keine Erinnerungen von A" "$(run authenticated $B 'select count(*) from public.erinnerung;')" "^0$"
ok "B kann Erinnerung von A nicht löschen" "$(run authenticated $B 'delete from public.erinnerung;')" "DELETE 0"
ok "anon sieht keine Erinnerungen" "$(run anon - 'select * from public.erinnerung;')" "permission denied"

echo "storage (Bucket dokumente)"
ok "A darf in eigenen Ordner hochladen" "$(run authenticated $A "insert into storage.objects(bucket_id,name) values ('dokumente','$A/$V/1.jpg');")" "INSERT 0 1"
ok "A darf nicht in Ordner von B hochladen" "$(run authenticated $A "insert into storage.objects(bucket_id,name) values ('dokumente','$B/x/1.jpg');")" "row-level security"
ok "Dateien ohne Nutzer-Ordner werden abgelehnt" "$(run authenticated $A "insert into storage.objects(bucket_id,name) values ('dokumente','1.jpg');")" "row-level security"
ok "B sieht Dateien von A nicht" "$(run authenticated $B 'select count(*) from storage.objects;')" "^0$"
ok "B kann Dateien von A nicht löschen" "$(run authenticated $B 'delete from storage.objects;')" "DELETE 0"
ok "B kann Dateien von A nicht umbenennen" "$(run authenticated $B "update storage.objects set name='$B/x/1.jpg';")" "UPDATE 0"
ok "A sieht die eigene Datei" "$(run authenticated $A 'select count(*) from storage.objects;')" "^1$"
ok "anon sieht keine Dateien" "$(run anon - 'select count(*) from storage.objects;')" "^0$\|permission denied"

echo "löschen"
ok "Löschen des Vorgangs entfernt Dokumente und Erinnerungen" "$(run authenticated $A "delete from public.vorgang where id='$V';" >/dev/null; $SU -c "select (select count(*) from public.dokument)+(select count(*) from public.erinnerung)")" "^0$"

echo; echo "Ergebnis: $pass bestanden, $fail fehlgeschlagen"; [ $fail -eq 0 ]
