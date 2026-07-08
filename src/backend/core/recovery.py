import os
import sys
import time

def interactive_recovery():
    print("======================================================================")
    print("                UMIS - DATABASE RECOVERY WIZARD")
    print("======================================================================")
    print("\n[!] A critical database conflict was detected (likely due to an upgrade).")
    print("    To fix this, the local database must be reset.")
    print("\nPlease choose an option:")
    print("  [1] Try to Backup Pharmacy Data to Desktop, then Wipe Database")
    print("  [2] Wipe Database immediately (All data will be lost!)")
    print("  [3] Cancel & Exit")
    print("")
    
    choice = input("Enter choice [1-3]: ").strip()
    
    if choice == '3':
        print("Exiting...")
        time.sleep(2)
        sys.exit(0)
        
    db_path = os.path.expanduser("~/.umis/db.sqlite3")
    
    if choice == '1':
        print("\n[*] Attempting to extract Pharmacy data to Desktop...")
        # We must run this through django
        os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'umis_backend.settings')
        import django
        from django.core.management import call_command
        try:
            django.setup()
            call_command('export_pharmacy_backup', interactive=False)
            print("[OK] Backup exported to Desktop successfully.")
        except Exception as e:
            print(f"[!] Backup failed: {str(e)}")
            print("    You may have to proceed with wiping the database anyway.")
            wipe = input("\nDo you still want to wipe the database? (y/n): ").strip().lower()
            if wipe != 'y':
                print("Exiting...")
                time.sleep(2)
                sys.exit(0)
                
    # Delete the DB
    if os.path.exists(db_path):
        print(f"\n[*] Deleting corrupted database at {db_path}...")
        try:
            os.remove(db_path)
            print("[OK] Database wiped.")
        except Exception as e:
            print(f"[!] Could not delete database: {str(e)}")
            print("    Please delete the file manually.")
    else:
        print("\n[*] Database file not found. Nothing to wipe.")
        
    print("\n======================================================================")
    print(" RECOVERY COMPLETE!")
    print("======================================================================")
    print("You may now double-click the UMIS Desktop icon to start fresh.")
    print("This window will close in 5 seconds...")
    time.sleep(5)
    sys.exit(0)

if __name__ == "__main__":
    interactive_recovery()
