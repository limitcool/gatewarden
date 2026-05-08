from pathlib import Path
from playwright.sync_api import sync_playwright


OUTPUT_DIR = Path(__file__).resolve().parents[1] / "tmp-smoke"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)


def assert_visible_text(page, text: str) -> None:
    locator = page.get_by_text(text, exact=False)
    locator.first.wait_for(timeout=15000)


with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={"width": 1440, "height": 1200})
    console_errors: list[str] = []
    page.on("console", lambda msg: console_errors.append(f"{msg.type}: {msg.text}") if msg.type == "error" else None)

    for route, marker, screenshot_name in [
        ("http://127.0.0.1:3010/dashboard/default", "概览", "overview.png"),
        ("http://127.0.0.1:3010/dashboard/events", "事件流", "events.png"),
        ("http://127.0.0.1:3010/dashboard/settings", "系统设置", "settings.png"),
    ]:
        page.goto(route, wait_until="networkidle")
        assert_visible_text(page, marker)
        page.screenshot(path=str(OUTPUT_DIR / screenshot_name), full_page=True)

    body_text = page.locator("body").inner_text()
    if "正在加载配置" in body_text:
        raise AssertionError("settings page is still stuck on loading state")

    browser.close()

    if console_errors:
        raise AssertionError("\n".join(console_errors))
