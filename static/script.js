let roomListDiv = document.getElementById('room-list')
let messagesDiv = document.getElementById('messages')
let newMessageForm = document.getElementById('new-message')
let newRoomForm = document.getElementById('new-room')
let statusDiv = document.getElementById('status')

let roomTemplate = document.getElementById('room')
let messageTemplate = document.getElementById('message')

let messageField = newMessageForm.querySelector('#message')
let usernameField = newMessageForm.querySelector('#username')
let roomNameField = newRoomForm.querySelector('#name')

var STATE = {
	room: 'lobby',
	rooms: {},
	connected: false,
}

const Body = document.getElementById('messages')
Body.scrollTo(0, Body.scrollHeight)

function hashColor(str) {
	let hash = 0
	for (var i = 0; i < str.length; i++) {
		hash = str.charCodeAt(i) + ((hash << 5) - hash)
		hash = hash & hash
	}

	return `hsl(${hash % 360}, 100%, 70%)`
}

function addRoom(name) {
	if (STATE[name]) {
		changeRoom(name)
		return false
	}

	var node = roomTemplate.content.cloneNode(true)
	var room = node.querySelector('.room')
	room.addEventListener('click', () => changeRoom(name))
	room.textContent = name
	room.dataset.name = name
	roomListDiv.appendChild(node)

	STATE[name] = []
	changeRoom(name)
	return true
}

function changeRoom(name) {
	if (STATE.room == name) return

	var newRoom = roomListDiv.querySelector(`.room[data-name='${name}']`)
	var oldRoom = roomListDiv.querySelector(`.room[data-name='${STATE.room}']`)
	if (!newRoom || !oldRoom) return

	STATE.room = name
	oldRoom.classList.remove('active')
	newRoom.classList.add('active')

	messagesDiv.querySelectorAll('.message').forEach(msg => {
		messagesDiv.removeChild(msg)
	})

	STATE[name].forEach(data => addMessage(name, data.username, data.message))
}

function addMessage(room, username, message, push = false) {
	if (push) {
		STATE[room].push({ username, message })
	}

	if (STATE.room == room) {
		var node = messageTemplate.content.cloneNode(true)
		node.querySelector('.message .username').textContent = username
		node.querySelector('.message .username').style.color = hashColor(username)
		node.querySelector('.message .text').textContent = message
		messagesDiv.appendChild(node)
	}
}

function subscribe(uri) {
	var retryTime = 1

	function connect(uri) {
		const events = new EventSource(uri)

		events.addEventListener('message', ev => {
			const msg = JSON.parse(ev.data)
			if (!'message' in msg || !'room' in msg || !'username' in msg) return
			addMessage(msg.room, msg.username, msg.message, true)
		})

		events.addEventListener('open', () => {
			setConnectedStatus(true)
			retryTime = 1
		})

		events.addEventListener('error', () => {
			setConnectedStatus(false)
			events.close()

			let timeout = retryTime
			retryTime = Math.min(64, retryTime * 2)
			setTimeout(() => connect(uri), (() => timeout * 1000)())
		})
	}

	connect(uri)
}

function setConnectedStatus(status) {
	STATE.connected = status
	statusDiv.className = status ? 'connected' : 'reconnecting'
}

function init() {
	addRoom('lobby')
	addRoom('rocket')
	changeRoom('lobby')
	addMessage(
		'lobby',
		'Rocket',
		'Хей! Добро пожаловать в чат хекса.\nНадеюсь что вам понравится моя работа)',
		true
	)
	addMessage(
		'rocket',
		'Rocket',
		'Хей! Добро пожаловать в чат хекса.\nНадеюсь что вам понравится моя работа)',
		true
	)

	newMessageForm.addEventListener('submit', e => {
		e.preventDefault()

		const room = STATE.room
		const message = messageField.value
		const username = usernameField.value || 'guest'
		if (!message || !username) return

		if (STATE.connected) {
			fetch('/message', {
				method: 'POST',
				body: new URLSearchParams({ room, username, message }),
			}).then(response => {
				if (response.ok) messageField.value = ''
			})
		}
	})
	newRoomForm.addEventListener('submit', e => {
		e.preventDefault()

		const room = roomNameField.value
		if (!room) return

		roomNameField.value = ''
		if (!addRoom(room)) return

		addMessage(
			room,
			'Rocket',
			`Смотри, твоя собственная "${room}" комната! Отлично.`,
			true
		)
	})
	subscribe('/events')
}

init()
