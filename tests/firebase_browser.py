"""Check the Google-only Firebase authentication entry against demo emulators."""
import os
import subprocess
import time
import urllib.request
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parents[1]
assert os.environ.get("FIRESTORE_EMULATOR_HOST") and os.environ.get("FIREBASE_AUTH_EMULATOR_HOST"), "Start with firebase emulators:exec"
subprocess.run(["node", "--input-type=module", "-e", """
import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
initializeApp({projectId:'demo-flagforge'});
const db = getFirestore();
await db.doc('meta/control').set({maintenance:false});
await db.doc('challenges/browser-fixture').set({title:'Browser boundary',description:'Verify the real Firebase adapter.',category:'Web',difficulty:'Easy',points:75,authorName:'Instructor',published:true,solveCount:0,createdAt:new Date(),files:[],hints:[]});
await db.doc('challengeSecrets/browser-fixture').set({flag:'FLAG{adapter}',caseInsensitive:false});
await db.terminate();
"""], cwd=ROOT, check=True, timeout=30)
env = dict(os.environ, VITE_DATA_MODE="firebase", VITE_FIREBASE_PROJECT_ID="demo-flagforge", VITE_FIREBASE_API_KEY="demo-key", VITE_FIREBASE_AUTH_DOMAIN="localhost", VITE_FIREBASE_APP_ID="demo-app", VITE_USE_EMULATORS="true")
server = subprocess.Popen(["npm", "run", "dev", "--", "--port", "5174"], cwd=ROOT, env=env, stdout=subprocess.DEVNULL)
try:
    for _ in range(60):
        try:
            urllib.request.urlopen("http://127.0.0.1:5174", timeout=1).close()
            break
        except OSError:
            time.sleep(0.25)
    else:
        raise RuntimeError("Firebase browser test server did not start.")
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True, args=["--disable-dev-shm-usage"])
        page = browser.new_page(reduced_motion="reduce")
        errors = []
        page.on("pageerror", lambda e: errors.append(str(e)))
        page.goto("http://127.0.0.1:5174/login?returnTo=/challenges/browser-fixture")
        expect(page.get_by_role("button", name="Continue with Google", exact=True)).to_be_visible(timeout=30000)
        expect(page.get_by_label("Email address", exact=True)).to_have_count(0)
        expect(page.get_by_label("Password", exact=True)).to_have_count(0)
        assert not errors, errors
        browser.close()
        print("Real Firebase adapter: Google-only authentication entry passed.")
finally:
    server.terminate()
    server.wait(timeout=15)
