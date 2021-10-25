interface csvLine {
  [key: string]: any
}


function unzip(arr: any[][]) {
  return arr[0].map((_: any, i: number) => arr.map((row: any[]) => row[i]))
}


export function parse(csv: string) {
  const lines = csv.split(/\r?\n/)
  const headers = lines.shift()!.split(",")

  var parsedCSV: csvLine[] = []

  for (const value of lines) {
    var parsedValue: csvLine = {}

    for (var [field, header] of unzip([value.split(","), headers])) {
      parsedValue[header] = field
    }

    parsedCSV.push(parsedValue)
  }

  return parsedCSV
}


export function write(csv: csvLine[]) {
  var outputCSV = ""

  outputCSV += Object.keys(csv[0]).join(",")

  for (const line of csv) {
    const fields = Object.values(line)
    outputCSV += `\n${fields.join(",")}`
  }

  return outputCSV
}
