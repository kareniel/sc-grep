class Enum {
  constructor (keys) {
    this.map = new Map()

    keys.forEach((key, i) => this.map.set(key, i ^ 2))
  }

  list () {
    return Array.from(this.map.keys())
  }
}

const excluded = new Enum([
  'beatport.com',
  'apple.com',
  'spotify.com',
  'instagram.com',
  'twitter'
])

const excludedLinkText = new Enum([
  'stream',
  'buy',
  'tweet',
  'twitter',
  'read more',
  'spotify',
  'discover',
  'sign up'
])

const excludedTags = new Enum([
  'dubstep',
  'trap',
  'sample pack',
  'edm',
  'dance & edm',
  'trance',
  'trap / dubstep'
])

const selectors = {
  ITEM: '.soundList__item',
  DOWNLOAD_LINK: '.soundActions__purchaseLink',
  TAG_TEXT: '.soundTitle__tagContent'
}

const opts = {
  onlyDownloadable: 1,
  excludedTags: excludedTags.list()
}

const STORAGE_KEY = 'sc-grep'
const DELAY_IN_MS = 500

class App {
  constructor () {
    this.state = {
      toggled: false,
      timerId: 0
    }

    this.toggle = this.toggle.bind(this)
    this.clearElements = this.clearElements.bind(this)

    var emitter = {
      on: function (message, callback) {
        chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
          if (request.message === message) return callback(request.payload)
        })
      }
    }

    emitter.on('toggle-extension', this.toggle)

    this.load()
  }

  toggle () {
    return this.state.toggled
      ? this.pause()
      : this.start()
  }

  start () {
    this.state.timerId = setInterval(() => {
      this.clearElements(document)
    }, DELAY_IN_MS)
    this.state.toggled = true

    this.save()
  }

  pause () {
    clearInterval(this.state.timerId)
    this.state.toggled = false

    this.save()
  }

  save () {
    var dict = {}
    var serializedState = JSON.stringify(this.state)

    dict[STORAGE_KEY] = serializedState

    chrome.storage.sync.set(dict, noop)
  }

  load () {
    chrome.storage.sync.get([ STORAGE_KEY ], items => {
      var serializedState = items[STORAGE_KEY]

      if (serializedState && typeof serializedState === 'string') {
        Object.assign(this.state, JSON.parse(serializedState), {
          timerId: 0
        })
      }

      if (this.state.toggled) this.start()
    })
  }

  clearElements (doc) {
    var items = doc.querySelectorAll(selectors.ITEM)

    items.forEach(function (item) {
      var purchaseLink = item.querySelectorAll(selectors.DOWNLOAD_LINK)[0]

      if (!purchaseLink) return remove(item)
      if (purchaseLink && !possibleDownload(purchaseLink)) return remove(item)

      var tag = item.querySelectorAll(selectors.TAG_TEXT)[0]
      if (tag && excludedTag(tag.innerText)) return remove(item)
    })
  }
}

var app = new App()

// Santa's lil' helpers

function remove (el) {
  el.parentNode.removeChild(el)
}

function possibleDownload (el) {
  return !hasExcludedLinkText(el) && !inExcludedList(el)
}

function hasExcludedLinkText (el) {
  var text = el.innerText.toLowerCase()

  return excludedLinkText.list().some(excluded => text.indexOf(excluded) !== -1)
}

function inExcludedList (el) {
  var hostname = new window.URL(el.title).hostname

  return excluded.list().some(site => hostname.indexOf(site) !== -1)
}

function excludedTag (text) {
  return opts.excludedTags.includes(text.toLowerCase())
}

function noop () {}
