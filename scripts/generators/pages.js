const { GET_DIR_FOLDERS, DELETE_FOLDERS, WRITE_FILE } = require('../utils/io')
const logg = require('../utils/logg')

const pagesFolder = 'src/app/pages'

const capitalizeFirstLetter = (string) => {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

const pageTpl = (pageContent) => `
<div>
  ${pageContent}
</div>
`

const componentTpl = (path) => {
  const kebabName = path.split('/').join('-')
  const shortName = path.split('/').reverse()[0]
  const componentName = path.split('/').map(p => capitalizeFirstLetter(p)).join('').split('-').map(p => capitalizeFirstLetter(p)).join('')
  return `import { Component, OnInit } from '@angular/core'

@Component({
  selector: 'app${kebabName}',
  templateUrl: './${shortName}.component.html',
})
export class ${componentName}Component implements OnInit {
  constructor() {}
  ngOnInit() {}
}`
}

const rowTpl = (row) => row && `<div class="row">${columnsTpl(row.columns)}</div>`

const columnsTpl = (items) => {
  let columns = ''
  items && items.forEach((column) => {
    columns = columns + `<div class="${column.className}">${cardTpl(column.cards)}</div>`
  })
  return columns
}

const cardTpl = (items) => {
  let cards = ''
  items && items.forEach((card) => {
    cards = cards + `<div class="${card.extraClass ? card.extraClass : 'card'}">${widgetTpl(card.widgets)}</div>`
  })
  return cards
}

const widgetTpl = (items) => {
  let widgets = ''
  items && items.forEach((widget) => {
    const [folder, name] = widget.name.split('-')
    const props = widget.data ? ` [data]="${JSON.stringify(widget.data).replace(/"/ig, '\'')}"` : ''
    const kebabCase = (string) => {
      return string
        .replace(/([a-z])([A-Z])/g, "$1-$2")
        .replace(/\s+/g, '-')
        .toLowerCase();
    }
    const formatName = (string) => {
      const i = string.search(/\d/)
      const index = i < 0 ? 0 : i
      const a = index ? string.slice(0, index) : ''
      const b = string.slice(index)
      return a + '-' + b
    }
    const widgetName = `vb-${kebabCase(folder + formatName(name))}`
    let widgetCode = ''
    if (widget.wrapper === false) {
      widgetCode = `<${widgetName}${props}></${widgetName}>`
    } else {
      widgetCode = `<div class="${widget.wrapper ? widget.wrapper : 'card-body'}"><${widgetName}${props}></${widgetName}></div>`
    }
    widgets = widgets + widgetCode
  })
  return widgets
}

module.exports = (config, content) => {
  // wipe directory folders, excluding 'auth' folder
  const foldersToRemove = GET_DIR_FOLDERS(pagesFolder)
    .filter((item) => {
      return item !== 'auth'
    })
  DELETE_FOLDERS(pagesFolder, foldersToRemove)

  // generate pages
  const generatePages = (config, level = 1) => {
    let prefixSpaces = ''
    Array(level)
      .fill()
      .forEach(() => (prefixSpaces = prefixSpaces + '   '))

    config.forEach((page) => {
      const { key, category, title, url: path } = page
      const pageContent = content[key]
      // skip category items & auth pages
      if (category || path === '/auth') {
        return
      }

      const generateContent = (content) => {
        if (!content) {
          return ``
        }
        let code = ''
        content.forEach((row) => {
          code = code + rowTpl(row)
        })
        return code
      }

      const formattedTitle = title
        .replace(/\b\w/g, (l) => l.toUpperCase())
        .replace(/[^a-zA-Z]/g, '')
      const generatedPageContent = generateContent(pageContent)
      const generatedPage = pageTpl(generatedPageContent)
      const generatedComponent = componentTpl(path)
      const shortName = path.split('/').reverse()[0]

      WRITE_FILE(pagesFolder, path, `${shortName}.component.html`, generatedPage, 'html')
      WRITE_FILE(pagesFolder, path, `${shortName}.component.ts`, generatedComponent, 'typescript')
      logg(`${path}/index.js`, 'clean', `${prefixSpaces} └─ `)

      if (page.children) {
        generatePages(page.children, level + 1)
      }
    })
  }
  generatePages(config)
}
