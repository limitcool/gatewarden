from pathlib import Path
from playwright.sync_api import expect, sync_playwright


BASE_URL = "http://127.0.0.1:3010"
OUTPUT_DIR = Path(__file__).resolve().parents[1] / "tmp-interactions"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)


def save(page, name: str) -> None:
    page.screenshot(path=str(OUTPUT_DIR / name), full_page=True)


with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={"width": 1440, "height": 1200})
    console_errors: list[str] = []
    page.on(
        "console",
        lambda msg: console_errors.append(f"{msg.type}: {msg.text}") if msg.type == "error" else None,
    )

    page.goto(f"{BASE_URL}/dashboard/default", wait_until="networkidle")
    expect(page.locator("main h1")).to_have_text("概览", timeout=15000)

    notification_button = page.get_by_role("button", name="通知")
    expect(notification_button).to_be_visible()
    notification_button.click()
    expect(page.get_by_text("清除红点")).to_be_visible()
    page.get_by_role("button", name="清除红点").click()
    expect(page.locator("span.bg-status-error")).to_have_count(0)
    page.keyboard.press("Escape")
    save(page, "overview-notifications-cleared.png")

    collapse_button = page.locator("aside").get_by_role("button").first
    expect(collapse_button).to_be_visible()
    collapse_button.click()
    expect(page.get_by_role("link", name="概览")).to_be_visible()
    expect(page.locator("aside").get_by_role("button").first).to_be_visible()
    save(page, "overview-sidebar-collapsed.png")

    page.goto(f"{BASE_URL}/dashboard/events", wait_until="networkidle")
    expect(page.locator("main h1")).to_have_text("事件流", timeout=15000)

    hide_coverage_button = page.get_by_role("button", name="隐藏接入状态")
    expect(hide_coverage_button).to_be_visible()

    init_cool_chip = page.get_by_role("button").filter(has_text="init.cool").first
    expect(init_cool_chip).to_be_visible(timeout=15000)
    init_cool_chip.click()
    expect(page.get_by_role("button", name="清除域名筛选")).to_be_visible()

    advanced_button = page.get_by_role("button", name="高级筛选")
    advanced_button.click()
    advanced_dialog = page.locator('[data-radix-popper-content-wrapper]').last
    expect(advanced_dialog.get_by_text("访问域名", exact=True)).to_be_visible()
    advanced_dialog.get_by_role("button", name="应用筛选").click()

    first_row = page.locator("button[aria-expanded]").first
    first_row.click()
    expect(page.get_by_text("IP 详情")).to_be_visible()
    save(page, "events-filtered-expanded.png")

    page.goto(f"{BASE_URL}/dashboard/settings", wait_until="networkidle")
    expect(page.locator("main h1")).to_have_text("系统设置", timeout=15000)
    body_text = page.locator("body").inner_text()
    if "当前后端没有返回结构化配置" in body_text:
        expect(page.get_by_text("当前后端没有返回结构化配置")).to_be_visible()
        expect(page.get_by_role("button", name="重新加载")).to_be_visible()
    else:
        expect(page.get_by_role("heading", name="结构化配置")).to_be_visible()
        expect(page.get_by_label("控制台语言")).to_be_visible()
        expect(page.get_by_text("已接入域名")).to_be_visible()
    save(page, "settings-loaded.png")

    browser.close()

    if console_errors:
        raise AssertionError("\n".join(console_errors))
