"""Yo'l O'yini: statik fayllar + multiplayer (WebSocket) serveri.
Ishga tushirish:  pip install aiohttp  &&  python server.py
Keyin brauzerda http://localhost:8080 oching (do'stlar ham shu manzilga kirsa, birga o'ynaysiz)."""
import json, os, time, uuid
from aiohttp import web, WSMsgType

ROOT = os.path.dirname(os.path.abspath(__file__))
rooms = {}  # trassa nomi -> {id: {"ws":..., "state":{...}}}

async def ws_handler(request):
    ws = web.WebSocketResponse(heartbeat=20)
    await ws.prepare(request)
    pid, room = uuid.uuid4().hex[:6], None
    await ws.send_json({"t": "hi", "id": pid})
    try:
        async for msg in ws:
            if msg.type != WSMsgType.TEXT:
                continue
            data = json.loads(msg.data)
            if data.get("t") == "j":                      # xonaga qo'shilish
                if room: rooms[room].pop(pid, None)
                room = str(data.get("track", "0"))[:8]
                rooms.setdefault(room, {})[pid] = {"ws": ws, "state": {}}
            elif data.get("t") == "s" and room:           # holatni yangilash
                s = {k: data.get(k) for k in ("x", "y", "a", "v", "car", "name")}
                rooms[room][pid]["state"] = s
                payload = {"t": "p", "players": [dict(p["state"], id=i) for i, p in rooms[room].items() if i != pid and p["state"]]}
                await ws.send_json(payload)
    finally:
        if room: rooms.get(room, {}).pop(pid, None)
    return ws

async def index(_):
    return web.FileResponse(os.path.join(ROOT, "index.html"))

app = web.Application()
app.add_routes([web.get("/ws", ws_handler), web.get("/", index), web.static("/", ROOT)])

if __name__ == "__main__":
    web.run_app(app, host="0.0.0.0", port=int(os.environ.get("PORT", 8080)))
