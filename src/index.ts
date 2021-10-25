import inquirer from "inquirer"
import { login, makeTasks, runTask, Task } from "./browser"
import { parse } from "./csv"
import { readFile } from "fs/promises"


interface Account {
  email: string
  password: string
}


(async () => {
  inquirer.registerPrompt("fs-selector", require("inquirer-fs-selector"))

  const accountsFile = await readFile("./accounts.csv", "utf8")
  // @ts-ignore
  const accounts: Account[] = parse(accountsFile)

  console.log("Abrindo navegador, aguarde alguns instantes...")

  const { browser, page } = await login(
    accounts[0].email,
    accounts[0].password,
    { headless: false }
  )

  await inquirer.prompt({
    name: "_",
    message: "Foi aberto um navegador, preencha os dados do anúncio e aperte ENTER"
  })

  const structure = await makeTasks(browser, page)

  const { tasksDelay }: { tasksDelay: number } = await inquirer.prompt({
    type: "number",
    name: "tasksDelay",
    message: "Tempo de espera para cada anúncio (em minutos)",
    default: 5
  })

  const { cyclesQuantity }: { cyclesQuantity: number } = await inquirer.prompt({
    type: "number",
    name: "cyclesQuantity",
    message: "Informe a quantidade de ciclos",
    default: 1
  })

  const { cycleDelay }: { cycleDelay: number } = await inquirer.prompt({
    type: "number",
    name: "cycleDelay",
    message: "Tempo de espera para cada ciclo (em minutos)",
    default: 5
  })

  const titles = [structure.input_subject]
  const descriptions = [structure.input_body]

  while (true) {
    const { title }: { title: string } = await inquirer.prompt({
      type: "input",
      name: "title",
      message: "Informe mais uma opção de título para o anúncio (ou deixe vazio para concluir)"
    })

    if (title) {
      titles.push(title)
    } else {
      break
    }
  }

  while (true) {
    const { description }: { description: string } = await inquirer.prompt({
      type: "input",
      name: "description",
      message: "Informe mais uma opção de descrição para o anúncio (ou deixe vazio para concluir)"
    })

    if (description) {
      descriptions.push(description)
    } else {
      break
    }
  }

  var images = []

  images.push((await inquirer.prompt({
    // @ts-ignore
    type: "fs-selector",
    name: "image",
    message: "Selecione a imagem principal",
    basePath: "./"
  })).image.path)

  while (true) {
    const continuePrompt = await inquirer.prompt({
      type: "confirm",
      name: "continue",
      message: "Deseja adicionar uma imagem?",
    })

    if (!continuePrompt.continue) break

    images.push((await inquirer.prompt({
      // @ts-ignore
      type: "fs-selector",
      name: "image",
      message: "Selecione a imagem",
      basePath: "./"
    })).image.path)
  }

  for (let i = 0; i <= cyclesQuantity - 1; i++) {
    for (const account of accounts) {
      const task: Task = {
        id: "",
        account,
        structure: {
          ...structure,
          input_subject: titles[Math.floor(Math.random() * titles.length)],
          input_body: descriptions[Math.floor(Math.random() * descriptions.length)],
          images
        }
      }
      setTimeout(
        () => runTask(task),
        (tasksDelay * 60000 * (accounts.indexOf(account) + 1)) + (i * 60000 * cycleDelay)
      )
    }
  }
})()
