import os
import shutil
import py_compile
from setuptools import setup, find_packages
from setuptools.command.build_py import build_py

# Toggle this flag to True if you want to compile into bytecode (.pyc) and hide the source code
# (Note: bytecode compilation binds the wheel to a specific Python version, e.g. Python 3.13)
OBFUSCATE_SOURCE = False

class ObfuscatedBuildPy(build_py):
    """
    Custom build command that compiles all python files in the distribution
    into bytecode (.pyc) files and deletes the raw .py text files, protecting
    intellectual property during wheel packaging.
    """
    def run(self):
        # 1. Execute standard setuptools build first to collect files in build/lib
        super().run()
        
        if not OBFUSCATE_SOURCE:
            print("\n=======================================================")
            print("   UMIS UNIVERSAL BUILD PIPELINE: ALL PYTHON VERSIONS ")
            print("=======================================================")
            print(" -> Source obfuscation disabled. Building a universal wheel.")
            print("=======================================================\n")
            return
        
        build_lib = self.build_lib
        print(f"\n=======================================================")
        print(f"   UMIS SOURCE OBFUSCATION PIPELINE: COMPILING TO .PYC ")
        print(f"=======================================================")
        print(f"Staging library path: {build_lib}")
        
        # 2. Iterate through built packages
        for root, dirs, files in os.walk(build_lib):
            for file in files:
                # Do not compile init files to preserve package exports
                if file.endswith('.py') and file != '__init__.py':
                    py_path = os.path.join(root, file)
                    pyc_path = py_path + 'c' # e.g. cli.py -> cli.pyc
                    
                    try:
                        # Compile to bytecode directly in target folder
                        py_compile.compile(py_path, cfile=pyc_path, doraise=True)
                        # Remove original raw source code file
                        os.remove(py_path)
                        print(f" -> Compiled and Obfuscated: {file}")
                    except Exception as e:
                        print(f" -> Failed to obfuscate {file}: {str(e)}")
        print("=======================================================\n")

# Read readme
with open("README.md", "r", encoding="utf-8") as fh:
    long_description = fh.read()

setup(
    name="umis",
    version="1.0.15",
    author="Upemba National Park Medical Department",
    author_email="bonheurndezenc@gmail.com",
    description="Upemba Medical Information System - Local Offline Package",
    long_description=long_description,
    long_description_content_type="text/markdown",
    packages=find_packages(exclude=["tests", "*.tests", "*.tests.*", "tests.*"]),
    py_modules=["cli"], # CLI launcher module
    include_package_data=True,
    package_data={
        # Recursively include Next.js pre-compiled static assets and templates
        "core": ["static/**/*", "static/*", "templates/**/*", "templates/*"],
    },
    install_requires=[
        "django>=6.0.5",
        "django-cors-headers>=4.9.0",
        "django-filter>=25.2",
        "djangorestframework>=3.17.1",
        "djangorestframework-simplejwt>=5.5.1",
        "openpyxl>=3.1.5",
        "requests>=2.32.3",
        "uvicorn>=0.22.0",
    ],
    entry_points={
        "console_scripts": [
            "umis-start=cli:main",
        ],
    },
    cmdclass={
        "build_py": ObfuscatedBuildPy,
    },
    classifiers=[
        "Programming Language :: Python :: 3",
        "License :: OSI Approved :: MIT License",
        "Operating System :: Microsoft :: Windows",
    ],
    python_requires=">=3.10",
)
