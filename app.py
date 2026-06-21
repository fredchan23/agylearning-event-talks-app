import re
import requests
import xml.etree.ElementTree as ET
from flask import Flask, jsonify, render_template

app = Flask(__name__)

FEED_URL = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"

def clean_namespaces(xml_string):
    # Strip namespaces to simplify parsing with ElementTree
    return re.sub(r'\sxmlns="[^"]+"', '', xml_string, count=1)

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/api/releases")
def get_releases():
    try:
        response = requests.get(FEED_URL, timeout=10)
        response.raise_for_status()
        
        # Parse XML
        # Remove namespace for easier tag lookup
        xml_data = clean_namespaces(response.text)
        root = ET.fromstring(xml_data.encode('utf-8'))
        
        entries = []
        for entry_node in root.findall('entry'):
            title = entry_node.find('title')
            title_text = title.text if title is not None else ""
            
            id_node = entry_node.find('id')
            id_text = id_node.text if id_node is not None else ""
            
            updated = entry_node.find('updated')
            updated_text = updated.text if updated is not None else ""
            
            link = entry_node.find('link')
            link_href = link.attrib.get('href', '') if link is not None else ""
            
            content = entry_node.find('content')
            content_html = content.text if content is not None else ""
            
            entries.append({
                "id": id_text,
                "title": title_text,
                "updated": updated_text,
                "link": link_href,
                "content": content_html
            })
            
        return jsonify({"status": "success", "entries": entries})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000, debug=True)
