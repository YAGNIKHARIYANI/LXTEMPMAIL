import json
import os
import random
import string
import time
from typing import Optional, Dict, Any, Tuple

BASE_URL = "https://web2.temp-mail.org"
MAILTM_BASE_URL = "https://api.mail.tm"

def get_base_headers() -> Dict[str, str]:
    return {
        'accept': '*/*',
        'accept-encoding': 'gzip, deflate, br, zstd',
        'accept-language': 'en-US,en;q=0.9,gu;q=0.8',
        'origin': 'https://temp-mail.org',
        'referer': 'https://temp-mail.org/',
        'sec-ch-ua': '"Google Chrome";v="153", "Not_A Brand";v="8", "Chromium";v="153"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"Windows"',
        'sec-fetch-dest': 'empty',
        'sec-fetch-mode': 'cors',
        'sec-fetch-site': 'same-site',
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36'
    }

class TempMailClient:
    def __init__(self):
        self._init_session()

    def _init_session(self):
        try:
            from curl_cffi import requests as cffi_requests
            self.session = cffi_requests.Session(impersonate="chrome120")
            self.engine = "curl_cffi"
        except Exception:
            import requests
            self.session = requests.Session()
            self.engine = "requests"

    def _auth_headers(self, token: Optional[str] = None) -> Dict[str, str]:
        headers = get_base_headers()
        if token:
            headers['authorization'] = f'Bearer {token}'
        return headers

    def create_mailbox(self) -> Dict[str, Any]:
        """Creates a new temporary mailbox. Tries web2.temp-mail.org first, falls back to Mail.tm on Cloudflare blocks (403/429)."""
        # 1. Try web2.temp-mail.org
        try:
            headers = self._auth_headers()
            resp = self.session.post(f"{BASE_URL}/mailbox", headers=headers, json={}, timeout=8)
            if resp.status_code == 200:
                data = resp.json()
                if "token" in data and "mailbox" in data:
                    return data
        except Exception as e:
            print(f"[DEBUG] web2.temp-mail.org error ({e}), switching to Cloud Engine...")

        # 2. Seamless Cloud Engine Fallback (Guaranteed to work in serverless/Vercel)
        return self._create_mailtm_account()

    def _create_mailtm_account(self) -> Dict[str, Any]:
        """Creates a disposable mailbox using Mail.tm cloud engine."""
        import requests
        sess = requests.Session()
        
        # Get active domain
        d_res = sess.get(f"{MAILTM_BASE_URL}/domains", timeout=10)
        d_data = d_res.json()
        members = d_data.get("hydra:member", [])
        if not members:
            raise Exception("No active mail domains available at this time.")
        domain = members[0]["domain"]
        
        # Generate random credentials
        rand_str = ''.join(random.choices(string.ascii_lowercase + string.digits, k=8))
        address = f"lx_{rand_str}@{domain}"
        password = f"P@{rand_str}123!"
        
        # Create account
        sess.post(f"{MAILTM_BASE_URL}/accounts", json={"address": address, "password": password}, timeout=10)
        
        # Retrieve JWT Token
        tok_res = sess.post(f"{MAILTM_BASE_URL}/token", json={"address": address, "password": password}, timeout=10)
        tok_data = tok_res.json()
        raw_token = tok_data.get("token")
        
        if not raw_token:
            raise Exception("Failed to retrieve token from cloud engine.")
            
        return {
            "token": f"mtm_{raw_token}",
            "mailbox": address
        }

    def get_mailbox(self, token: str) -> Dict[str, Any]:
        """Retrieves mailbox info for the active token."""
        if token.startswith("mtm_"):
            real_token = token[4:]
            import requests
            r = requests.get(f"{MAILTM_BASE_URL}/me", headers={"Authorization": f"Bearer {real_token}"}, timeout=10)
            if r.status_code == 200:
                return {"mailbox": r.json().get("address")}
            return {"mailbox": "Active Mailbox"}

        headers = self._auth_headers(token)
        resp = self.session.get(f"{BASE_URL}/mailbox", headers=headers, timeout=10)
        if resp.status_code >= 400:
            raise Exception(f"Failed to get mailbox: [{resp.status_code}] {resp.text}")
        return resp.json()

    def get_messages(self, token: str, after: Optional[str] = None) -> Dict[str, Any]:
        """Fetches inbox messages list for the current mailbox."""
        if token.startswith("mtm_"):
            real_token = token[4:]
            import requests
            r = requests.get(f"{MAILTM_BASE_URL}/messages", headers={"Authorization": f"Bearer {real_token}"}, timeout=10)
            if r.status_code >= 400:
                raise Exception(f"Failed to get messages: [{r.status_code}] {r.text}")
            
            data = r.json()
            members = data.get("hydra:member", [])
            normalized_messages = []
            
            for m in members:
                from_obj = m.get("from", {})
                from_addr = from_obj.get("address", "")
                from_name = from_obj.get("name", "")
                from_str = f'"{from_name}" <{from_addr}>' if from_name else from_addr
                
                normalized_messages.append({
                    "id": m.get("id"),
                    "_id": m.get("id"),
                    "from": from_str,
                    "subject": m.get("subject", "(No Subject)"),
                    "bodyPreview": m.get("intro", ""),
                    "receivedAt": m.get("createdAt", ""),
                    "attachmentsCount": len(m.get("attachments", []))
                })
            
            return {
                "mailbox": "Active Mailbox",
                "messages": normalized_messages
            }

        headers = self._auth_headers(token)
        params = {}
        if after:
            params['after'] = after
        resp = self.session.get(f"{BASE_URL}/messages", headers=headers, params=params, timeout=10)
        if resp.status_code >= 400:
            raise Exception(f"Failed to get messages: [{resp.status_code}] {resp.text}")
        return resp.json()

    def get_message(self, token: str, message_id: str) -> Dict[str, Any]:
        """Fetches full email message details and HTML content."""
        if token.startswith("mtm_"):
            real_token = token[4:]
            import requests
            r = requests.get(f"{MAILTM_BASE_URL}/messages/{message_id}", headers={"Authorization": f"Bearer {real_token}"}, timeout=10)
            if r.status_code >= 400:
                raise Exception(f"Failed to get message: [{r.status_code}] {r.text}")
            
            m = r.json()
            from_obj = m.get("from", {})
            from_addr = from_obj.get("address", "")
            from_name = from_obj.get("name", "")
            from_str = f'"{from_name}" <{from_addr}>' if from_name else from_addr
            
            html_content = m.get("html")
            if isinstance(html_content, list) and len(html_content) > 0:
                html_body = html_content[0]
            elif isinstance(html_content, str):
                html_body = html_content
            else:
                html_body = m.get("text", "")
                
            attachments_raw = m.get("attachments", [])
            attachments = []
            for att in attachments_raw:
                attachments.append({
                    "id": att.get("id"),
                    "_id": att.get("id"),
                    "filename": att.get("filename", "attachment"),
                    "size": att.get("size", 0),
                    "mimetype": att.get("contentType", "application/octet-stream"),
                    "downloadUrl": att.get("downloadUrl", "")
                })

            return {
                "id": m.get("id"),
                "_id": m.get("id"),
                "from": from_str,
                "subject": m.get("subject", "(No Subject)"),
                "bodyHtml": html_body,
                "body": m.get("text", ""),
                "bodyPreview": m.get("intro", ""),
                "receivedAt": m.get("createdAt", ""),
                "attachmentsCount": len(attachments),
                "attachments": attachments
            }

        headers = self._auth_headers(token)
        resp = self.session.get(f"{BASE_URL}/messages/{message_id}", headers=headers, timeout=10)
        if resp.status_code >= 400:
            raise Exception(f"Failed to get message: [{resp.status_code}] {resp.text}")
        return resp.json()

    def delete_message(self, token: str, message_id: str) -> Dict[str, Any]:
        """Deletes a message by ID."""
        if token.startswith("mtm_"):
            real_token = token[4:]
            import requests
            r = requests.delete(f"{MAILTM_BASE_URL}/messages/{message_id}", headers={"Authorization": f"Bearer {real_token}"}, timeout=10)
            if r.status_code >= 400:
                raise Exception(f"Failed to delete message: [{r.status_code}] {r.text}")
            return {"success": True, "messageId": message_id}

        headers = self._auth_headers(token)
        resp = self.session.delete(f"{BASE_URL}/messages/{message_id}", headers=headers, timeout=10)
        if resp.status_code >= 400:
            raise Exception(f"Failed to delete message: [{resp.status_code}] {resp.text}")
        return {"success": True, "messageId": message_id}

    def get_message_source(self, token: str, message_id: str) -> str:
        """Fetches raw RFC822 EML source."""
        if token.startswith("mtm_"):
            real_token = token[4:]
            import requests
            r = requests.get(f"{MAILTM_BASE_URL}/messages/{message_id}/download", headers={"Authorization": f"Bearer {real_token}"}, timeout=10)
            if r.status_code == 200:
                return r.text
            msg_data = self.get_message(token, message_id)
            return f"From: {msg_data.get('from')}\nSubject: {msg_data.get('subject')}\nDate: {msg_data.get('receivedAt')}\n\n{msg_data.get('body')}"

        headers = self._auth_headers(token)
        resp = self.session.get(f"{BASE_URL}/messages/{message_id}/source", headers=headers, timeout=10)
        if resp.status_code >= 400:
            raise Exception(f"Failed to get message source: [{resp.status_code}] {resp.text}")
        return resp.text

    def get_attachment(self, token: str, message_id: str, attachment_id: str) -> Tuple[bytes, str, str]:
        """Downloads an attachment."""
        if token.startswith("mtm_"):
            real_token = token[4:]
            import requests
            # Fetch message to get attachment download url
            msg_data = self.get_message(token, message_id)
            target_att = next((a for a in msg_data.get("attachments", []) if str(a.get("id")) == str(attachment_id)), None)
            if target_att and target_att.get("downloadUrl"):
                r = requests.get(f"{MAILTM_BASE_URL}{target_att['downloadUrl']}", headers={"Authorization": f"Bearer {real_token}"}, timeout=20)
                return r.content, target_att.get("mimetype", "application/octet-stream"), target_att.get("filename", "attachment")
            raise Exception("Attachment not found")

        headers = self._auth_headers(token)
        resp = self.session.get(
            f"{BASE_URL}/messages/{message_id}/attachment/{attachment_id}",
            headers=headers,
            timeout=30
        )
        if resp.status_code >= 400:
            raise Exception(f"Failed to download attachment: [{resp.status_code}] {resp.text}")
        
        content_type = resp.headers.get("content-type", "application/octet-stream")
        content_disp = resp.headers.get("content-disposition", "")
        filename = "attachment"
        if "filename=" in content_disp:
            filename = content_disp.split("filename=")[-1].strip('"\';')
        
        return resp.content, content_type, filename
