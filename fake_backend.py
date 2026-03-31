from http.server import BaseHTTPRequestHandler, HTTPServer
import json

class MockAdminHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        
        path = self.path
        if '/api/admin/overview' in path:
            self.wfile.write(json.dumps({"status": "Excellent", "uptime": "Mocked 24h"}).encode('utf-8'))
        elif '/api/admin/jobs' in path:
            self.wfile.write(json.dumps({"items": [{"id": 1, "status": "running"}, {"id": 2, "status": "completed"}]}).encode('utf-8'))
        elif '/api/admin/gateway/logs' in path:
            self.wfile.write(json.dumps({"items": [{"id": 101, "event": "comment"}, {"id": 102, "event": "reply"}, {"id": 103, "event": "error"}]}).encode('utf-8'))
        elif '/api/admin/audit/summary' in path:
            self.wfile.write(json.dumps({"audits": 5, "details": "Mocked audit data"}).encode('utf-8'))
        else:
            self.wfile.write(json.dumps({"error": "not found"}).encode('utf-8'))

if __name__ == '__main__':
    server = HTTPServer(('127.0.0.1', 18000), MockAdminHandler)
    print("Starting mock backend on 18000...")
    server.serve_forever()
