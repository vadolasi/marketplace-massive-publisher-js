import { chromium, Browser, Page, LaunchOptions } from "playwright"


export async function login(email: string, password: string, options: LaunchOptions = {}) {
  const browser = await chromium.launch(options)
  const page = await browser.newPage()

  await page.goto("https://olx.com.br")
  await page.click(
    "#gatsby-focus-wrapper > div:nth-child(2) > div.sc-gPEVay.edvRD > header > div.sc-bRBYWo.kSKrRG > div > a"
  )
  await page.type("input[type=\"email\"]", email)
  await page.type("input[type=\"password\"]", password)
  await page.click("button[type=\"text\"]")

  return { browser, page }
}


export async function makeTasks(browser: Browser, page: Page) {
  const inputs = await page.$$("input")
  const textareas = await page.$$("textarea")
  const selects = await page.$$("select")

  var structure: { [key: string]: any } = {}

  for (const input of inputs) {
    const inputID = await input.getAttribute("id")
    const inputType = await input.getAttribute("type")
    const inputValue = await input.getAttribute("value")

    if (inputType === "text" || inputType === "hidden") {
      structure[inputID] = inputValue
    } else if (inputType === "checkbox" || inputType === "radio") {
      structure[inputID] = Boolean(inputValue)
    }
  }

  for (const textarea of textareas) {
    structure[await textarea.getAttribute("id")] = await textarea.textContent()
  }

  for (const select of selects) {
    // @ts-ignore
    const selectedOption = await page.$eval(`#${await select.getAttribute("id")}`, sel => sel.options[sel.options.selectedIndex].textContent)
    structure[await select.getAttribute("id")] = selectedOption
  }

  await browser.close()

  return structure
}


export interface Task {
  id: string
  account: {
    email: string
    password: string
  }
  structure: { [key: string]: any }
}


export async function runTask(task: Task) {
  const { browser, page } = await login(
    task.account.email,
    task.account.password,
    { headless: false, slowMo: 250 }
  )

  const category: string = task.structure.input_category

  await page.click(`[id^="category_item-${category.slice(0, category.length - 2)}"]`)
  await page.click(`#category_item-${category}`)

  var inputsList = []

  while (true) {
    const inputs = await page.$$("input")
    const textareas = await page.$$("textarea")
    const selects = await page.$$("select")

    if ([...inputs, ...textareas, ...selects].length === inputsList.length) {
      break
    }

    for (const input of inputs) {
      if (inputsList.includes(input)) {
        continue
      }

      const inputID = await input.getAttribute("id")
      const inputType = await input.getAttribute("type")

      if (inputID === "price") {
        await input.type(task.structure.price.slice(0, task.structure.price.length - 2))
      } else if (inputType === "text") {
        await input.type(task.structure[inputID])
      } else if (inputType === "checkbox" || inputType === "radio") {
        await input.setChecked(task.structure[inputID])
      }
    }

    for (const textarea of textareas) {
      if (inputsList.includes(textarea)) {
        continue
      }

      await textarea.type(task.structure[await textarea.getAttribute("id")])
    }

    for (const select of selects) {
      if (inputsList.includes(select)) {
        continue
      }

      await select.selectOption({ label: task.structure[await select.getAttribute("id")] })
    }

    inputsList = [...inputs, ...textareas, ...selects]
  }

  for (const image of task.structure.images) {
    await page.setInputFiles(
      "#group-image-container > div.ads-forms__image-drag-and-drop > div.image-container__box > input",
      image
    )
  }

  await page.dblclick("#ad_insertion_submit_button", { force: true })

  await browser.close()
}
