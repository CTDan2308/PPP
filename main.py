
import os
from http.server import SimpleHTTPRequestHandler, HTTPServer

class MyHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        # Hỗ trợ CORS nếu cần thiết cho việc debug
        self.send_header('Access-Control-Allow-Origin', '*')
        super().end_headers()

def run(server_class=HTTPServer, handler_class=MyHandler, port=8000):
    server_address = ('', port)
    httpd = server_class(server_address, handler_class)
    print(f"Server POS đang chạy tại cổng {port}...")
    print("Truy cập http://localhost:8000 để bắt đầu bán hàng.")
    httpd.serve_forever()

if __name__ == "__main__":
    # Điểm khởi đầu chính của ứng dụng
    run()
