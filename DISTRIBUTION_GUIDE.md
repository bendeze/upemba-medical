# UMIS Distribution Guide: Python Wheels & Standalone Executables

Welcome to the **Upemba Medical Information System (UMIS)** deployment reference sheet. This document details how to package, distribute, and run your software offline on employee computers. It explains the mechanics behind **Universal Wheels** and **Standalone Executables (`.exe`)**, how they work conceptually, and how to rebuild them.

---

## 1. Core Concepts: What are Wheels and Executables?

| Concept | Python Wheel (`.whl`) | Standalone Executable (`.exe`) |
| :--- | :--- | :--- |
| **What it is** | A standard Python package archive (a zip file with metadata) that installs directly into an existing Python environment. | A single, compiled Windows binary containing the app, resources, and the Python interpreter itself. |
| **Prerequisites** | The target computer **must** have Python installed (any version like 3.11, 3.12, 3.13 if universal). | **Zero prerequisites.** Works on any Windows 10/11 computer out-of-the-box. |
| **How it runs** | Executed in a terminal via a launcher command (e.g. `py -m cli` or `umis-start`). | Executed like a normal Windows program by double-clicking the `UMIS.exe` icon. |
| **IP Protection** | Code can be obfuscated into bytecode (`.pyc`), but bytecode is version-locked to a specific Python release. | High security; code and interpreter are bundled together in a single binary. |

---

## 2. Behind the Scenes: How the Packaging Pipeline Works

The UMIS build system utilizes a **Next.js static-export pipeline** combined with **Django asset staging** to deliver a single, offline-first application:

```
[Next.js Frontend] ──(npm run build)──> [Static Export: HTML/CSS/JS]
                                                  │
                                          (Staged Into)
                                                  ▼
                                       [Django App: core/static]
                                                  │
                      ┌───────────────────────────┴──────────────────────────┐
                      ▼                                                      ▼
           [Python Wheel Pipeline]                               [PyInstaller Compiler]
         (python setup.py bdist_wheel)                             (pyinstaller umis.spec)
                      │                                                      │
                      ▼                                                      ▼
         umis-1.0.0-py3-none-any.whl                                      UMIS.exe
        (Runs on any Python system)                            (Runs on any Windows PC)
```

1. **Frontend Export:** The Next.js frontend compiles all React pages into static HTML exports (`output: 'export'` in `next.config.ts`).
2. **Asset Staging:** These static files are copied directly into the Django **`core/static/`** folder, and the base `index.html` is placed in **`core/templates/`**. This ensures the frontend is physically packaged inside the Django app.
3. **Django URL Routing:** When the browser calls a file (like `/_next/static/chunks/...`), Django catches the route and serves the embedded Next.js static asset instantly from the `core/static` package directory.
4. **Binary Compilation:**
   * **For Wheels:** Setuptools packages the files into a standard `.whl` library.
   * **For Executables:** PyInstaller reads `umis.spec`, bundles the complete Python interpreter, and compiles the code and static folders into a single, standalone `UMIS.exe` binary.

---

## 3. How to Operate & Build the Packaging Pipelines

### A. The Universal Python Wheel (`.whl`)
Ideal for lightweight distribution on computers that already have Python installed.

#### 1. Rebuilding locally
Make sure your frontend is built, then run:
```bash
cd src/backend
python setup.py bdist_wheel
```
*Your universal wheel will be created inside `src/backend/dist/umis-1.0.0-py3-none-any.whl`.*

#### 2. Deploying via GitHub Actions
We have automated this! Simply push a tag to GitHub to trigger compilation:
```bash
git tag v1.0.6
git push origin v1.0.6
```
GitHub Actions will automatically build, package, and upload the wheel directly to your **GitHub Releases** draft!

#### 3. Installing on an employee computer
Copy the `.whl` file to the target computer and run:
```bash
py -m pip install ./umis-1.0.0-py3-none-any.whl --force-reinstall
```

#### 4. Launching the wheel system
```bash
py -m cli
```

---

### B. The Standalone Executable (`.exe`)
The premium, single-file Windows setup for standard employees with **zero technical prerequisites**.

#### 1. Prerequisites (For the developer compiling the EXE)
Install PyInstaller locally:
```bash
py -m pip install pyinstaller
```

#### 2. Compiling the `.exe`
Run the compiler inside the backend folder using your custom specification file:
```bash
cd src/backend
pyinstaller umis.spec
```
*PyInstaller will bundle all assets, dependencies, and the Python runtime into a single file.*

#### 3. Accessing the Executable
Once the build completes successfully, go to:
📁 **`src/backend/dist/`**
You will see your beautiful **`UMIS.exe`** file, customized with a medical cross icon!

#### 4. Deploying to Employees
1. Copy **`UMIS.exe`** to their computer (via USB, shared drive, or private link).
2. The employee simply **double-clicks the file** to run it. No installations, no terminals, and no configuration required!

---

### C. The 1-Click Automated Installer (Recommended)
This is the fastest and easiest way to distribute UMIS on employee computers. The script automatically installs Python (if missing), downloads the latest `.whl` package, configures silent background startup, and adds a Desktop shortcut—all in one command.

#### 1. Internet Installation (via GitHub)
If the employee computer has internet access, simply open **PowerShell** as an administrator (or normal user) and run:
```powershell
powershell -c "irm https://raw.githubusercontent.com/bendeze/upemba-medical/main/scripts/install-umis.ps1 | iex"
```

#### 2. Offline USB Installation
If the employee computer is offline or if you prefer deploying from a USB:
1. Place the generated `umis-1.x.x-py3-none-any.whl` file inside the same folder as `install-umis.ps1` on your USB drive.
2. Open PowerShell in that folder and run:
```powershell
.\install-umis.ps1
```
The script will automatically detect the local `.whl` file and install it without reaching out to GitHub.

---

## 4. Automating Startup on Employee Machines

To provide a seamless experience for clinic employees, you can automate launching UMIS when their Windows machine starts up. We have provided an interactive startup utility at the root of the project:

📁 **`configure-startup.bat`** (Batch script wrapper)
📁 **`scripts/configure-startup.ps1`** (Core automation logic)

### How to Use the Startup Utility
1. Copy **`configure-startup.bat`** and the **`scripts/`** folder to the employee's computer.
2. If using the standalone distribution, ensure **`UMIS.exe`** is also placed on the computer.
3. Double-click **`configure-startup.bat`** (no administrator privileges required).
4. Select the configuration that matches the deployment:
   * **Option 1 (Standalone EXE):** The script automatically scans for `UMIS.exe`. If it is not in the folder, it opens a native Windows File Browser for you to locate it.
   * **Option 2 (Python Wheel):** Sets up startup using the global `umis-start` command.
5. Choose the **Window Style** for the launch:
   * **Hidden (Background) [Recommended]:** UMIS boots completely silently in the background. No terminal window pops up on the employee's screen, but the system starts and opens their default web browser automatically!
   * **Minimized:** Launches minimized in the taskbar.
   * **Normal Window:** Opens with a visible command prompt window displaying boot logs.
6. To disable automatic startup at any time, run the script again and select **Option 3: Remove UMIS from Startup**.

