"""Exercise the actual Firebase adapter against demo emulators, never production."""
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
server = subprocess.Popen(["node", "node_modules/netlify-cli/bin/run.js", "dev", "--port", "5174"], cwd=ROOT, env=env, stdout=subprocess.DEVNULL)
try:
    for _ in range(60):
        try:
            urllib.request.urlopen("http://127.0.0.1:5174", timeout=1).close()
            break
        except OSError:
            time.sleep(0.25)
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True, args=["--disable-dev-shm-usage"])
        page = browser.new_page(reduced_motion="reduce")
        errors = []
        page.on("pageerror", lambda e: errors.append(str(e)))
        page.goto("http://127.0.0.1:5174/register?returnTo=/challenges/browser-fixture")
        page.get_by_label("Display name", exact=True).fill("Adapter learner")
        page.get_by_label("Username", exact=True).fill("adapter_learner")
        page.get_by_label("Email address", exact=True).fill("adapter@example.test")
        page.get_by_label("Password", exact=True).fill("ExamplePass123!")
        page.get_by_role("button", name="Create account", exact=True).click()
        expect(page.get_by_role("heading", name="Browser boundary", exact=True)).to_be_visible(timeout=30000)
        expect(page.get_by_text("0 attempts", exact=False)).to_be_visible()
        page.get_by_label("Flag", exact=True).fill("wrong")
        page.get_by_role("button", name="Verify flag").click()
        expect(page.get_by_role("alert").filter(has_text="does not match")).to_be_visible(timeout=15000)
        page.get_by_label("Flag", exact=True).fill("FLAG{adapter}")
        page.get_by_role("button", name="Verify flag").click()
        expect(page.get_by_role("heading", name="Discovery verified.")).to_be_visible(timeout=15000)
        page.reload()
        expect(page.get_by_role("heading", name="Discovery verified.")).to_be_visible(timeout=15000)
        expect(page.get_by_text("+75 points", exact=True)).to_be_visible()
        page.get_by_role("link", name="Leaderboard", exact=True).click()
        expect(page.get_by_role("rowheader").filter(has_text="Adapter learner")).to_be_visible(timeout=15000)
        assert not errors, errors
        browser.close()
        print("Real Firebase adapter: signup, profile, missing attempt, incorrect/correct flag, persisted solve, and leaderboard passed.")
finally:
    server.terminate()
    server.wait(timeout=15)
