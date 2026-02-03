# # import uvicorn
# # from fastapi import FastAPI
# # from fastapi.middleware.cors import CORSMiddleware
# # from pydantic import BaseModel
# # from typing import List, Any  # Changed to Any to allow strings
# #
# # app = FastAPI()
# #
# # app.add_middleware(
# #     CORSMiddleware,
# #     allow_origins=["*"],
# #     allow_credentials=True,
# #     allow_methods=["*"],
# #     allow_headers=["*"],
# # )
# #
# #
# # # CHANGED: items is now List[List[Any]] to accept [w, h, d, weight, fragile, id_string]
# # class PackRequest(BaseModel):
# #     bin: List[float]
# #     items: List[List[Any]]
# #
# #
# # class Box:
# #     def __init__(self, w, h, d, weight, fragile, id):
# #         self.w = w
# #         self.h = h
# #         self.d = d
# #         self.weight = weight
# #         self.fragile = fragile
# #         self.id = id  # Store the unique ID string
# #         self.position = None
# #
# #
# # def intersect(b1, pos1, b2, pos2):
# #     return (
# #             pos1[0] < pos2[0] + b2.w and pos1[0] + b1.w > pos2[0] and
# #             pos1[1] < pos2[1] + b2.h and pos1[1] + b1.h > pos2[1] and
# #             pos1[2] < pos2[2] + b2.d and pos1[2] + b1.d > pos2[2]
# #     )
# #
# #
# # @app.post("/pack")
# # def pack_items(req: PackRequest):
# #     bin_w, bin_h, bin_d = req.bin
# #
# #     boxes = []
# #     for i, item in enumerate(req.items):
# #         # Expecting: [w, h, d, weight, fragile, id]
# #         # Fallback to "Item N" if no ID is provided
# #         custom_id = item[5] if len(item) > 5 else f"Item {i + 1}"
# #         boxes.append(Box(item[0], item[1], item[2], item[3], bool(item[4]), custom_id))
# #
# #     # Sort: Fragile last, Heaviest first, Largest first
# #     boxes.sort(key=lambda x: (x.fragile, -x.weight, -(x.w * x.h * x.d)))
# #
# #     packed_boxes = []
# #
# #     for box in boxes:
# #         best_pos = None
# #         # Start at origin + corners of existing boxes
# #         candidate_points = [(0, 0, 0)]
# #         for pb in packed_boxes:
# #             px, py, pz = pb.position
# #             pw, ph, pd = pb.w, pb.h, pb.d
# #             candidate_points.append((px + pw, py, pz))
# #             candidate_points.append((px, py + ph, pz))
# #             candidate_points.append((px, py, pz + pd))
# #             candidate_points.append((px, py + ph, pz))  # Stack logic
# #
# #         candidate_points.sort(key=lambda p: (p[1], p[2], p[0]))
# #
# #         placed = False
# #         orientations = [(box.w, box.h, box.d), (box.d, box.h, box.w)]
# #
# #         for w, h, d in orientations:
# #             if placed: break
# #             for x, y, z in candidate_points:
# #                 if x + w > bin_w or y + h > bin_h or z + d > bin_d: continue
# #
# #                 collision = False
# #                 for pb in packed_boxes:
# #                     if intersect(type('obj', (object,), {'w': w, 'h': h, 'd': d}), (x, y, z), pb, pb.position):
# #                         collision = True
# #                         break
# #
# #                 if not collision:
# #                     box.w, box.h, box.d = w, h, d
# #                     box.position = [x, y, z]
# #                     packed_boxes.append(box)
# #                     placed = True
# #                     break
# #
# #     return {"packed_items": [{
# #         "id": box.id,  # Return the ID
# #         "dimensions": [box.w, box.h, box.d],
# #         "position": box.position,
# #         "weight": box.weight,
# #         "fragile": box.fragile
# #     } for box in packed_boxes]}
# #
# #
# # if __name__ == "__main__":
# #     uvicorn.run(app, host="0.0.0.0", port=8000)
#
#
# import uvicorn
# from fastapi import FastAPI, HTTPException
# from fastapi.middleware.cors import CORSMiddleware
# from pydantic import BaseModel
# from typing import List, Any, Optional
# import sys
#
# # --- TRY TO IMPORT NGROK ---
# # This allows the server to run even if ngrok fails or isn't installed
# try:
#     from pyngrok import ngrok
#
#     HAS_NGROK = True
# except ImportError:
#     HAS_NGROK = False
#     print("Warning: 'pyngrok' not installed. Server will run locally only.")
#
# app = FastAPI(title="Smart Stack API")
#
# # --- CORS: ALLOW FRONTEND CONNECTION ---
# app.add_middleware(
#     CORSMiddleware,
#     allow_origins=["*"],
#     allow_credentials=True,
#     allow_methods=["*"],
#     allow_headers=["*"],
# )
#
# # --- GLOBAL STORAGE (In-Memory Database) ---
# # Stores the result of the last successful packing job
# LATEST_PACK = {
#     "status": "waiting",
#     "message": "No packing job has been run yet.",
#     "packed_items": []
# }
#
#
# # --- DATA MODELS ---
# class PackRequest(BaseModel):
#     bin: List[float]  # [width, height, depth]
#     items: List[List[Any]]  # [[w, h, d, weight, fragile, id], ...]
#
#
# class Box:
#     def __init__(self, w, h, d, weight, fragile, id):
#         self.w = float(w)
#         self.h = float(h)
#         self.d = float(d)
#         self.weight = float(weight)
#         self.fragile = bool(fragile)
#         self.id = str(id)
#         self.position = None  # [x, y, z]
#
#
# # --- ALGORITHM: COLLISION DETECTION ---
# def intersect(b1, pos1, b2, pos2):
#     """Check if two boxes overlap in 3D space."""
#     return (
#             pos1[0] < pos2[0] + b2.w and pos1[0] + b1.w > pos2[0] and
#             pos1[1] < pos2[1] + b2.h and pos1[1] + b1.h > pos2[1] and
#             pos1[2] < pos2[2] + b2.d and pos1[2] + b1.d > pos2[2]
#     )
#
#
# # --- ALGORITHM: PACKING LOGIC ---
# def run_packing_logic(bin_dims, items_data):
#     bin_w, bin_h, bin_d = bin_dims
#
#     # 1. Parse Items into Box Objects
#     boxes = []
#     for i, item in enumerate(items_data):
#         # Flexible parsing to handle potentially missing columns safely
#         w = item[0]
#         h = item[1]
#         d = item[2]
#         weight = item[3] if len(item) > 3 else 0
#         fragile = item[4] if len(item) > 4 else False
#         uid = item[5] if len(item) > 5 else f"Item-{i + 1}"
#
#         boxes.append(Box(w, h, d, weight, fragile, uid))
#
#     # 2. Sort Strategy (Crucial for Physics)
#     # - Fragile items LAST (so they are packed on top)
#     # - Heavier items FIRST (so they sink to bottom)
#     # - Larger volume FIRST (tie-breaker for efficiency)
#     boxes.sort(key=lambda x: (x.fragile, -x.weight, -(x.w * x.h * x.d)))
#
#     packed_boxes = []
#
#     for box in boxes:
#         # Candidate Points: Origin + corners of existing boxes
#         # We add points for Top, Right, and Front of every placed box
#         candidate_points = [(0.0, 0.0, 0.0)]
#         for pb in packed_boxes:
#             px, py, pz = pb.position
#             pw, ph, pd = pb.w, pb.h, pb.d
#
#             candidate_points.append((px + pw, py, pz))  # Right
#             candidate_points.append((px, py + ph, pz))  # Top (Stacking)
#             candidate_points.append((px, py, pz + pd))  # Front
#
#         # Sort points: Prefer lower Y (gravity), then Back Z, then Left X
#         candidate_points.sort(key=lambda p: (p[1], p[2], p[0]))
#
#         placed = False
#
#         # Try standard orientation (0) and rotated on floor (90)
#         orientations = [
#             (box.w, box.h, box.d),
#             (box.d, box.h, box.w)
#         ]
#
#         for w, h, d in orientations:
#             if placed: break
#
#             for x, y, z in candidate_points:
#                 # Boundary Check
#                 if x + w > bin_w or y + h > bin_h or z + d > bin_d:
#                     continue
#
#                 # Collision Check
#                 collision = False
#                 for pb in packed_boxes:
#                     # Create temporary box for intersection check
#                     temp_box = type('obj', (object,), {'w': w, 'h': h, 'd': d})
#                     if intersect(temp_box, (x, y, z), pb, pb.position):
#                         collision = True
#                         break
#
#                 if not collision:
#                     # Success! Place the box
#                     box.w, box.h, box.d = w, h, d
#                     box.position = [x, y, z]
#                     packed_boxes.append(box)
#                     placed = True
#                     break
#
#     # 3. Format Response
#     return [{
#         "id": box.id,
#         "dimensions": [box.w, box.h, box.d],
#         "position": box.position,
#         "weight": box.weight,
#         "fragile": box.fragile
#     } for box in packed_boxes]
#
#
# # --- API ENDPOINTS ---
#
# @app.get("/")
# def health_check():
#     """Simple check to see if server is online."""
#     return {
#         "status": "online",
#         "endpoints": ["POST /pack", "GET /latest-pack"],
#         "ngrok": "active" if HAS_NGROK else "inactive"
#     }
#
#
# @app.post("/pack")
# def pack_endpoint(req: PackRequest):
#     """
#     Receives list of items, calculates packing, returns result AND saves it.
#     """
#     global LATEST_PACK
#
#     # Run the logic
#     packed_items = run_packing_logic(req.bin, req.items)
#
#     # Construct Result
#     result = {
#         "status": "success",
#         "bin_dimensions": req.bin,
#         "total_items": len(req.items),
#         "packed_count": len(packed_items),
#         "packed_items": packed_items
#     }
#
#     # Save to global variable (for the GET endpoint)
#     LATEST_PACK = result
#
#     return result
#
#
# @app.get("/latest-pack")
# def get_latest_pack():
#     """
#     Returns the result of the LAST packing operation.
#     Useful for fetching data without re-calculating.
#     """
#     return LATEST_PACK
#
#
# # --- SERVER STARTUP ---
# if __name__ == "__main__":
#     PORT = 8000
#
#     # Start Ngrok Tunnel (if installed)
#     if HAS_NGROK:
#         try:
#             # Kill any old tunnels to prevent errors
#             ngrok.kill()
#
#             # Connect
#             tunnel = ngrok.connect(PORT)
#             public_url = tunnel.public_url
#
#             print(f"\n{'-' * 60}")
#             print(f" 🚀 NGROK TUNNEL ONLINE")
#             print(f" Public URL:  {public_url}")
#             print(f" Local URL:   http://localhost:{PORT}")
#             print(f" API Docs:    {public_url}/docs")
#             print(f"{'-' * 60}\n")
#
#         except Exception as e:
#             print(f"Ngrok Error: {e}")
#             print("Running in local-only mode.")
#
#     # Start FastAPI
#     uvicorn.run(app, host="0.0.0.0", port=PORT)





import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Any
import sys

# --- TRY TO IMPORT NGROK ---
try:
    from pyngrok import ngrok
    HAS_NGROK = True
except ImportError:
    HAS_NGROK = False
    print("Warning: 'pyngrok' not installed. Server will run locally only.")

app = FastAPI(title="Smart Stack API")

# --- CORS: ALLOW FRONTEND CONNECTION ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- GLOBAL STORAGE ---
# This holds the data for the AR app
LATEST_PACK = {
    "status": "waiting",
    "message": "No packing job has been run yet.",
    "packed_items": []
}

class PackRequest(BaseModel):
    bin: List[float]
    items: List[List[Any]]

class Box:
    def __init__(self, w, h, d, weight, fragile, id):
        self.w, self.h, self.d = float(w), float(h), float(d)
        self.weight, self.fragile, self.id = float(weight), bool(fragile), str(id)
        self.position = None

def intersect(b1, pos1, b2, pos2):
    return (pos1[0] < pos2[0] + b2.w and pos1[0] + b1.w > pos2[0] and
            pos1[1] < pos2[1] + b2.h and pos1[1] + b1.h > pos2[1] and
            pos1[2] < pos2[2] + b2.d and pos1[2] + b1.d > pos2[2])

def run_packing_logic(bin_dims, items_data):
    bin_w, bin_h, bin_d = bin_dims
    boxes = [Box(i[0], i[1], i[2], i[3] if len(i)>3 else 0, i[4] if len(i)>4 else False, i[5] if len(i)>5 else f"Item-{x}") for x, i in enumerate(items_data)]
    boxes.sort(key=lambda x: (x.fragile, -x.weight, -(x.w * x.h * x.d)))
    packed_boxes = []

    for box in boxes:
        candidate_points = [(0.0, 0.0, 0.0)]
        for pb in packed_boxes:
            px, py, pz = pb.position
            candidate_points.extend([(px+pb.w, py, pz), (px, py+pb.h, pz), (px, py, pz+pb.d), (px, py+pb.h, pz)])
        candidate_points.sort(key=lambda p: (p[1], p[2], p[0]))

        placed = False
        for w, h, d in [(box.w, box.h, box.d), (box.d, box.h, box.w)]:
            if placed: break
            for x, y, z in candidate_points:
                if x+w > bin_w or y+h > bin_h or z+d > bin_d: continue
                if not any(intersect(type('o', (), {'w':w,'h':h,'d':d}), (x,y,z), pb, pb.position) for pb in packed_boxes):
                    box.w, box.h, box.d = w, h, d
                    box.position = [x, y, z]
                    packed_boxes.append(box)
                    placed = True
                    break

    return [{"id": b.id, "dimensions": [b.w, b.h, b.d], "position": b.position, "weight": b.weight, "fragile": b.fragile} for b in packed_boxes]

@app.get("/")
def health_check(): return {"status": "online"}

@app.post("/pack")
def pack_endpoint(req: PackRequest):
    global LATEST_PACK
    packed_items = run_packing_logic(req.bin, req.items)
    result = {"status": "success", "packed_items": packed_items}
    LATEST_PACK = result # Save for AR
    return result

@app.get("/latest-pack")
def get_latest_pack():
    return LATEST_PACK

if __name__ == "__main__":
    PORT = 8000
    if HAS_NGROK:
        try:
            ngrok.kill()
            tunnel = ngrok.connect(PORT)
            print(f"\n{'-'*60}")
            print(f" 🚀 NGROK PUBLIC URL: {tunnel.public_url}")
            print(f" COPY THIS URL into your index.html")
            print(f"{'-'*60}\n")
        except Exception as e: print(f"Ngrok Error: {e}")
    uvicorn.run(app, host="0.0.0.0", port=PORT)