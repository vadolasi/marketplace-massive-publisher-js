import { chromium, Browser, Page, LaunchOptions } from "playwright"


export async function login(email: string, password: string, options: LaunchOptions = {}) {
  const browser = await chromium.launch(options)
  const page = await browser.newPage()

  await page.goto("https://olx.com.br")
  await page.click("text=Anunciar")
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

  structure.category = await page.$$eval(
    "li.category__item.active > a", 
    elements => {
      if (elements.length === 0) {
        return false
      } else {
        return elements[0].getAttribute("title")
      }
    }
  )

  structure.subcategory = await page.$$eval(
    "li.subcategory__item.active > a",
    elements => {
      if (elements.length === 0) {
        return false
      } else {
        return elements[0].getAttribute("title")
      }
    }
  )

  structure.grandsoncategory = await page.$$eval(
    "li.grandsoncategory__item.active > a",
    elements => {
      if (elements.length === 0) {
        return false
      } else {
        return elements[0].getAttribute("title")
      }
    }
  )

  console.log(structure)

  for (const input of inputs) {
    const inputID = await input.getAttribute("id")
    const inputType = await input.getAttribute("type")
    const inputValue = await input.getAttribute("value")

    if (inputType === "text") {
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

  await page.click(`text=${task.structure.category}`)
  if (task.structure.subcategory) {
    await page.click(`text=${task.structure.subcategory}`)
  }
  if (task.structure.grandsoncategory) {
    await page.click(`text=${task.structure.grandsoncategory}`)
  }

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
