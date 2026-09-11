import json
import os
import time
from typing import Optional, Dict, Any, Tuple

BASE_URL = "https://web2.temp-mail.org"

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
        # Try curl_cffi for TLS impersonation first
        try:
            from curl_cffi import requests as cffi_requests
            self.session = cffi_requests.Session(impersonate="chrome120")
            self.engine = "curl_cffi"
        except Exception as e:
            import requests
            self.session = requests.Session()
            self.engine = "requests"

    def _auth_headers(self, token: Optional[str] = None) -> Dict[str, str]:
        headers = get_base_headers()
        if token:
            headers['authorization'] = f'Bearer {token}'
        return headers

    def create_mailbox(self) -> Dict[str, Any]:
        """Generates a fresh live temporary mailbox dynamically."""
        headers = self._auth_headers()
        
        # Primary attempt
        try:
            resp = self.session.post(f"{BASE_URL}/mailbox", headers=headers, json={}, timeout=15)
            if resp.status_code == 200:
                return resp.json()
            if resp.status_code == 429:
                raise Exception("Rate limited: Please wait 10 seconds before requesting another new address.")
            raise Exception(f"Failed to create mailbox: [{resp.status_code}] {resp.text}")
        except Exception as e:
            # Fallback to requests if curl_cffi encountered environment issues
            if self.engine == "curl_cffi":
                try:
                    import requests
                    fallback_sess = requests.Session()
                    resp = fallback_sess.post(f"{BASE_URL}/mailbox", headers=headers, json={}, timeout=15)
                    if resp.status_code == 200:
                        return resp.json()
                except Exception:
                    pass
            raise e

    def get_mailbox(self, token: str) -> Dict[str, Any]:
        """Retrieves mailbox info for the active token."""
        headers = self._auth_headers(token)
        resp = self.session.get(f"{BASE_URL}/mailbox", headers=headers, timeout=15)
        if resp.status_code >= 400:
            raise Exception(f"Failed to get mailbox: [{resp.status_code}] {resp.text}")
        return resp.json()

    def get_messages(self, token: str, after: Optional[str] = None) -> Dict[str, Any]:
        """Fetches inbox messages list for the current mailbox."""
        headers = self._auth_headers(token)
        params = {}
        if after:
            params['after'] = after
        resp = self.session.get(f"{BASE_URL}/messages", headers=headers, params=params, timeout=15)
        if resp.status_code >= 400:
            raise Exception(f"Failed to get messages: [{resp.status_code}] {resp.text}")
        return resp.json()

    def get_message(self, token: str, message_id: str) -> Dict[str, Any]:
        """Fetches full email message details and HTML content."""
        headers = self._auth_headers(token)
        resp = self.session.get(f"{BASE_URL}/messages/{message_id}", headers=headers, timeout=15)
        if resp.status_code >= 400:
            raise Exception(f"Failed to get message: [{resp.status_code}] {resp.text}")
        return resp.json()

    def delete_message(self, token: str, message_id: str) -> Dict[str, Any]:
        """Deletes a message by ID."""
        headers = self._auth_headers(token)
        resp = self.session.delete(f"{BASE_URL}/messages/{message_id}", headers=headers, timeout=15)
        if resp.status_code >= 400:
            raise Exception(f"Failed to delete message: [{resp.status_code}] {resp.text}")
        return {"success": True, "messageId": message_id}

    def get_message_source(self, token: str, message_id: str) -> str:
        """Fetches raw RFC822 EML source."""
        headers = self._auth_headers(token)
        resp = self.session.get(f"{BASE_URL}/messages/{message_id}/source", headers=headers, timeout=15)
        if resp.status_code >= 400:
            raise Exception(f"Failed to get message source: [{resp.status_code}] {resp.text}")
        return resp.text

    def get_attachment(self, token: str, message_id: str, attachment_id: str) -> Tuple[bytes, str, str]:
        """Downloads an attachment."""
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
