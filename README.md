# 🛡️ LX TEMP MAIL

> **High-Performance Disposable Temporary Email Service**  
> *Developed by **Yagnik Hariyani** & **Vaidehi Hariyani***

---

## ✨ Overview

**LX TEMP MAIL** is a full-featured, real-time temporary disposable email web application powered by live API integration with advanced TLS/JA3 browser fingerprinting to ensure 100% uptime and spam protection.

---

## 🚀 Key Features

- **⚡ 100% Live Disposable Mailbox**: Instantly generate random disposable email addresses without registration.
- **🔄 Real-Time Live Sync & Auto-Refresh**: 10-second automatic countdown sync + 1-click manual refresh.
- **🌓 Dark & Light Mode Support**: Seamless toggle between sleek Dark Business and clean Light Modern UI.
- **📱 100% Mobile Responsive**: Adaptive master-detail layout with dedicated mobile back navigation.
- **📋 1-Click Copy & QR Code**: Copy your email address in one click or scan a QR code to use it on your mobile device.
- **📩 Rich Email Reader**:
  - Sandboxed HTML rendering.
  - Attachment detection and direct downloading.
  - Raw RFC822 / EML header inspection.
  - Popout / Print window support.
  - Individual message deletion.
- **🔊 Sound & Toast Alerts**: Web Audio API notification chime when new messages arrive.
- **🛡️ Anonymous & Secure**: Zero personal data collected; built-in auto-expiry and rate-limit recovery.

---

## 🛠️ Tech Stack

- **Backend**: Python 3.10+, FastAPI, Uvicorn, `curl_cffi` (Chrome TLS impersonation)
- **Frontend**: HTML5, Tailwind CSS, JavaScript (Vanilla ES6+), Lucide Icons, QRCode.js

---

## 📥 Installation & Running

1. **Clone the repository:**
   ```bash
   git clone https://github.com/YAGNIKHARIYANI/LXTEMPMAIL.git
   cd LXTEMPMAIL
   ```

2. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

3. **Start the application:**
   ```bash
   python run.py
   ```
   *Or with Uvicorn:*
   ```bash
   uvicorn server:app --host 127.0.0.1 --port 8000
   ```

4. **Access the Web App:**
   Open your browser and visit:
   👉 **`http://127.0.0.1:8000`**

---

## 👥 Authors & Developers

- **Yagnik Hariyani**
- **Vaidehi Hariyani**

---

## 📄 License

This project is open-source under the MIT License.
