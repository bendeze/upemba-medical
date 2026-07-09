import os
import sys
import webbrowser
import time
from django.core.management import call_command

def main():
    """
    Console entry point script executed by 'umis-start'.
    """
    print("======================================================================")
    print("       UMIS - UPEMBA MEDICAL INFORMATION SYSTEM SEEDED TERMINAL       ")
    print("======================================================================")
    
    # 1. Force standard Django environment configuration
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'umis_backend.settings')
    
    # 2. Setup Django framework internal systems
    import django
    try:
        django.setup()
    except Exception as e:
        print(f"-> Failed to initialize Django: {str(e)}")
        sys.exit(1)
        
    local_port = int(os.environ.get("PORT", 8001))
    
    # 2.5. Kill any ghost processes on the port to prevent [WinError 10048] Address in use
    def kill_process_on_port(port):
        import subprocess
        import re
        if sys.platform == "win32":
            try:
                output = subprocess.check_output(f"netstat -ano | findstr :{port}", shell=True).decode(errors='ignore')
                for line in output.strip().split('\n'):
                    if f":{port}" in line and "LISTENING" in line:
                        pid = line.strip().split()[-1]
                        if pid and pid != "0":
                            print(f"-> Terminating existing ghost process (PID: {pid}) on port {port}...")
                            result = subprocess.run(f"taskkill /PID {pid} /F /T", shell=True, capture_output=True, text=True)
                            if result.returncode != 0:
                                print(f"[!] Failed to kill process {pid}. You may need Administrator privileges.")
                                print(f"    Reason: {result.stderr.strip() or result.stdout.strip()}")
                            time.sleep(1) # Give OS a moment to free the socket
            except Exception as e:
                pass
                
    if "--stop" in sys.argv:
        print(f"\n[*] Stopping all UMIS background processes on port {local_port}...")
        kill_process_on_port(local_port)
        print("[OK] UMIS has been fully stopped.\n")
        sys.exit(0)
        
    kill_process_on_port(local_port)
    
    # 3. Execute database migrations programmatically
    print("\n[1/4] Synchronizing relational database structures...")
    try:
        call_command('migrate', interactive=False)
        print("-> Relational schema synchronized successfully.")
    except Exception as e:
        print(f"-> Critical failure initializing database migrations: {str(e)}")
        print("\n[!] Launching Database Recovery Wizard...")
        
        # Spawn an interactive recovery wizard in a visible terminal
        import subprocess
        if sys.platform == "win32":
            subprocess.run(["cmd.exe", "/c", "start", "cmd.exe", "/c", "py", "-m", "core.recovery"])
        else:
            # Fallback for linux/mac (mostly just for testing)
            os.system("python3 -m core.recovery")
            
        sys.exit(1)
        
    # 4. Programmatically seed default superuser credentials
    print("\n[2/4] Verifying compliance security clearance...")
    from django.contrib.auth.models import User
    admin_username = 'admin'
    admin_email = 'admin@upembamedical.org'
    admin_password = 'adminpassword'
    
    if not User.objects.filter(username=admin_username).exists():
        try:
            User.objects.create_superuser(admin_username, admin_email, admin_password)
            print(f"-> Created default administrative profile:")
            print(f"   * Username: {admin_username}")
            print(f"   * Password: {admin_password}")
        except Exception as e:
            print(f"-> Could not register default administrator profile: {str(e)}")
    else:
        print("-> Administrative profiles are active and secured.")
        
    # 5. Spin up browser mapping local client port
    url = f"http://127.0.0.1:{local_port}/"
    print(f"\n[3/4] Launching default client browser at {url}...")
    
    # Simple delay to give Uvicorn server a brief window to start up before browser calls
    try:
        # Launch browser asynchronously
        import threading
        def open_browser():
            time.sleep(1.5)
            webbrowser.open(url)
            
        def run_periodic_backup(interval_hours=24):
            while True:
                time.sleep(interval_hours * 3600)
                try:
                    call_command('export_pharmacy_backup', interactive=False)
                    print("-> Periodic automated pharmacy backup completed successfully.")
                except Exception as e:
                    print(f"-> Failed to run automated pharmacy backup: {str(e)}")
        
        threading.Thread(target=open_browser, daemon=True).start()
        threading.Thread(target=run_periodic_backup, args=(24,), daemon=True).start()
        print("-> Background scheduled backup initialized (Interval: 24h).")
    except Exception as e:
        print(f"-> browser redirect notice: open {url} manually. ({str(e)})")
        
    # 6. Boot standard server
    print(f"\n[4/4] Starting local medical web server on port {local_port}...")
    
    if sys.platform == "win32":
        print("-> Windows environment detected. Using robust Waitress WSGI server.")
        try:
            import waitress
            from umis_backend.wsgi import application
            waitress.serve(application, host="127.0.0.1", port=local_port)
        except ImportError:
            print("-> Waitress not found. Running Python default development wsgiref server...")
            from wsgiref.simple_server import make_server
            from umis_backend.wsgi import application
            server = make_server('127.0.0.1', local_port, application)
            server.serve_forever()
    else:
        print("-> Unix environment detected. Using high-performance Uvicorn ASGI server.")
        try:
            import uvicorn
            from umis_backend.asgi import application
            uvicorn.run(application, host="127.0.0.1", port=local_port, log_level="info")
        except ImportError:
            print("-> Uvicorn not found. Running Python default development wsgiref server...")
            from wsgiref.simple_server import make_server
            from umis_backend.wsgi import application
            server = make_server('127.0.0.1', local_port, application)
            server.serve_forever()
            
    print("\n[!] Application is shutting down. Running automated pharmacy backup...")
    try:
        call_command('export_pharmacy_backup', interactive=False)
    except Exception as e:
        print(f"-> Failed to run automated pharmacy backup: {str(e)}")

if __name__ == '__main__':
    main()
