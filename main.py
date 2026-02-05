
import os
import socket
from http.server import SimpleHTTPRequestHandler, HTTPServer

class SmartPOSHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        # Hỗ trợ CORS và ngăn chặn caching trong quá trình phát triển
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate')
        super().end_headers()

    # Quan trọng: Đảm bảo file .tsx được gửi đi với đúng định dạng để trình duyệt thực thi
    extensions_map = SimpleHTTPRequestHandler.extensions_map.copy()
    extensions_map.update({
        '.tsx': 'application/javascript',
        '.ts': 'application/javascript',
    })

def run_server():
    # Sử dụng cổng từ môi trường hoặc mặc định 8080
    port = int(os.environ.get("PORT", 8080))
    
    while port < 9000:
        try:
            server_address = ('', port)
            httpd = HTTPServer(server_address, SmartPOSHandler)
            print(f"🚀 Smart POS đã sẵn sàng tại cổng {port}")
            print(f"🔗 Truy cập: http://localhost:{port}")
            httpd.serve_forever()
            break
        except OSError as e:
            if e.errno == 98: # Cổng đã bị chiếm
                print(f"⚠️ Cổng {port} đã được sử dụng, đang thử cổng {port + 1}...")
                port += 1
            else:
                raise e

if __name__ == "__main__":
    run_server()
