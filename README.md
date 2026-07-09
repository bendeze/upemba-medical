<div align="center">
  <img src="https://raw.githubusercontent.com/bendeze/upemba-medical/main/docs/assets/logo.png" alt="UMIS Logo" width="200" />

  # Upemba Medical Information System (UMIS)

  *A robust, offline-first medical information system designed for remote environments.*

  [![Python 3.10+](https://img.shields.io/badge/python-3.10+-blue.svg)](https://www.python.org/downloads/)
  [![Next.js](https://img.shields.io/badge/Next.js-14-black)](https://nextjs.org/)
  [![Django](https://img.shields.io/badge/Django-6.0+-092E20)](https://www.djangoproject.com/)
  [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

</div>

## Overview
**UMIS (Upemba Medical Information System)** is a comprehensive medical management platform originally tailored for the Upemba National Park Medical Department. Built with a modern stack (Django & Next.js), its modular architecture makes it highly adaptable and ready to be customized by other clinics, hospitals, and medical establishments.

## Features
- **Offline-First Architecture**: Designed to function fully without an internet connection using local SQLite and standalone deployments.
- **Beneficiaries Management**: Secure, comprehensive management of employees and their dependents.
- **Pharmacy & Inventory**: Track stock movements, consumption, historical requisitions, and low-stock alerts.
- **Secure Access**: JWT-based authentication with strict domain validations (`@forgottenparks.org`).
- **Bilingual Interface**: Fully translated and localized in English and French.
- **1-Click Installation**: Frictionless USB or Internet-based Windows installer for zero-touch deployments.

## Quickstart Installation

We offer a 1-click installer for Windows users (via PowerShell).

```powershell
powershell -c "irm https://raw.githubusercontent.com/bonheurNE07/upemba-medical/main/scripts/install-umis.ps1 | iex"
```
*For offline installation via USB, please refer to our [Distribution Guide](https://github.com/bendeze/upemba-umis/blob/main/docs/DISTRIBUTION.md).*

## Architecture

UMIS utilizes a modern monolithic-but-decoupled architecture packaged together for offline distribution:
- **Backend**: Django & Django REST Framework
- **Frontend**: Next.js (React), TailwindCSS, built as static files and served natively by Django.
- **Database**: SQLite (Zero configuration needed).

## Contributing

We welcome contributions! Please see our [Contributing Guidelines](CONTRIBUTING.md) for details on how to set up your local development environment, run the frontend and backend, and submit Pull Requests.

Please note that this project is released with a [Contributor Code of Conduct](CODE_OF_CONDUCT.md). By participating in this project you agree to abide by its terms.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
