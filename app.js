/* eslint-disable no-undef */
const express = require('express')
var csrf = require('csurf')
const app = express()
const { Course, Chapter, Page, User } = require('./models')
const bodyParser = require('body-parser')
var cookieParser = require('cookie-parser')
const path = require('path')
const session = require('express-session')
const passport = require('passport')
const LocalStrategy = require('passport-local')
const connectEnsureLogin = require('connect-ensure-login')

app.set('view engine', 'ejs')
app.use(bodyParser.json())
app.use(express.static(path.join(__dirname, 'public')))
app.use(express.urlencoded({ extended: false }))
app.use(cookieParser('shh!Some secret string'))
app.use(csrf({ cookie: true }))

app.use(session({
  secret: 'my-super-secret-key-2344534532',
  cookie: {
    maxAge: 24 * 60 * 60 * 1000
  }
}))
app.use(passport.initialize())
app.use(passport.session())

passport.use(new LocalStrategy({
  usernameField: 'email',
  passwordField: 'password'
}, (username, password, done) => {
  User.findOne({ where: { email: username, password: password } })
    .then((user) => {
      if (user.role === 'educator') {
        return done(null, user, { role: 'educator' })
      } else if (user.role === 'student') {
        return done(null, user, { role: 'student' })
      } else {
        return done(null, false, { message: 'Unknown role' })
      }
    })
    .catch((error) => {
      return (error)
    })
}))

passport.serializeUser((user, done) => {
  console.log('Serializing user in session', user.id)
  done(null, user.id)
})

passport.deserializeUser((id, done) => {
  User.findByPk(id)
    .then(user => {
      done(null, user)
    })
    .catch(error => {
      done(error, null)
    })
})

// user Routes
app.get('/', (request, response) => {
  response.render('index', { title: 'LMS', csrfToken: request.csrfToken() })
})
app.get('/signup', (request, response) => {
  response.render('signup', { title: 'Signup', csrfToken: request.csrfToken() })
})
app.get('/login', (request, response) => {
  response.render('login', { title: 'Login', csrfToken: request.csrfToken() })
})
app.get('/educator', connectEnsureLogin.ensureLoggedIn(), (request, response) => {
  const currentUser = request.user
  response.render('educator', { name: currentUser.name })
})

app.post('/users', async (request, response) => {
  console.log('Name', request.body.name)
  try {
    const user = await User.create({
      name: request.body.name,
      email: request.body.email,
      password: request.body.password,
      role: request.body.role
    })
    console.log('User role', user.role)
    request.login(user, (error) => {
      if (error) {
        console.log(error)
        console.log('An error occurred during login through user')
      }
      response.redirect(`/${user.role}`)
    }
    )
  } catch (error) {
    console.log('Error while crerating a new User')
    console.log(error)
    response.status(500).json(error)
  }
})
// Course Routes
app.get('/course', connectEnsureLogin.ensureLoggedIn(), (request, response) => {
  response.render('course', { csrfToken: request.csrfToken() })
})

app.get('/educatorcourses', connectEnsureLogin.ensureLoggedIn(), async (request, response) => {
  try {
    const courses = await Course.findAll({
      include: [{ model: Chapter }]
    })

    response.render('educourses', { courses, csrfToken: request.csrfToken() })
  } catch (error) {
    console.log('Error while rendering Educator Courses page')
    return response.status(500).json(error)
  }
})
app.get('/courses', connectEnsureLogin.ensureLoggedIn(), async (request, response) => {
  response.render('course', {
    title: 'Create New Course',
    csrfToken: request.csrfToken()
  })
}
)
app.get('/educatorcourses/:courseId', connectEnsureLogin.ensureLoggedIn(), async (request, response) => {
  try {
    const courseId = request.params.courseId
    const course = await Course.findByPk(courseId, {
      include: [{ model: Chapter }]
    })

    if (!course) {
      console.log('Course not found')
      return response.status(404).send('Course not found')
    }

    const courses = await Course.findAll({
      include: [{ model: Chapter }]
    })

    response.render('educourses', { course, courses, csrfToken: request.csrfToken() })
  } catch (error) {
    console.error('Error while rendering Educator Courses page', error)
    return response.status(500).json(error)
  }
})

app.post('/courses', connectEnsureLogin.ensureLoggedIn(), async (request, response) => {
  console.log('Creating a course', request.body)
  const csrfToken = request.csrfToken()
  try {
    await Course.create({
      courseName: request.body.courseName,
      courseDescription: request.body.courseDescription,
      _csrf: csrfToken
    })
    return response.redirect('/educatorcourses')
  } catch (error) {
    console.log(error)
    return response.status(422).json(error)
  }
})
app.get('/courses/:courseId', connectEnsureLogin.ensureLoggedIn(), async (request, response) => {
  try {
    const course = await Course.findByPk(request.params.courseId)
    const chapters = await Chapter.findAll({
      where: { courseId: request.params.courseId }
    })
    if (course) {
      response.json({
        courseName: course.courseName,
        courseId: course.id,
        courseDescription: course.courseDescription,
        chapters
      })
    } else {
      // Handle the case where the course with the given ID is not found
      response.status(404).json({ error: 'Course not found' })
    }
  } catch (error) {
    console.log('Error while rendering Course Index page')
    return response.status(422).json(error)
  }
})
app.delete('/courses/:id', connectEnsureLogin.ensureLoggedIn(), async (request, response) => {
  const courseId = request.params.id

  console.log('We have to delete a course with ID: ', courseId)

  try {
    // Find all chapters associated with the course
    const chapters = await Chapter.findAll({ where: { courseId } })

    // Delete all pages associated with the chapters
    for (const chapter of chapters) {
      await Page.destroy({ where: { chapterId: chapter.id } })
    }

    // Delete all chapters associated with the course
    await Chapter.destroy({ where: { courseId } })

    // Delete the course
    const deletedCourse = await Course.remove(courseId)

    // Check if the course was successfully deleted
    if (deletedCourse) {
      return response.json({
        success: true,
        message: 'Course deleted successfully'
      })
    } else {
      return response.status(404).json({
        success: false,
        message: 'Course not found'
      })
    }
  } catch (err) {
    console.error(err)
    return response.status(422).json(err)
  }
})
// Chapter Routes
app.get('/chapter', connectEnsureLogin.ensureLoggedIn(), async (request, response) => {
  console.log('Available chapters')
})
app.post('/chapter/:courseId', connectEnsureLogin.ensureLoggedIn(), async (request, response) => {
  try {
    const courseId = parseInt(request.params.courseId, 10)
    const course = await Course.findByPk(courseId)

    if (!course) {
      console.log('Course not found')
      return response.status(404).send('Course not found')
    }

    await Chapter.create({
      chapterName: request.body.chapterName,
      chapterDescription: request.body.chapterDescription,
      courseId // Use the courseId from URL parameters
    })

    console.log('New Chapter added successfully')
    response.redirect(`/chapters/${courseId}`)
  } catch (error) {
    console.error('Error creating a chapter', error)
    response.status(422).json(error)
  }
})

app.get('/chapters/:courseId', connectEnsureLogin.ensureLoggedIn(), async (request, response) => {
  try {
    const courseId = request.params.courseId
    const course = await Course.findByPk(courseId)
    const chapters = await Chapter.findAll({
      where: { courseId }
    })

    response.render('chapter', { course, chapters, csrfToken: request.csrfToken() })
  } catch (error) {
    console.error('Error while rendering Chapters page', error)
    response.status(500).json({ error: 'Internal Server Error' })
  }
})
app.post('/chapter', connectEnsureLogin.ensureLoggedIn(), async (request, response) => {
  try {
    const course = await Course.findByPk(request.body.courseId)

    if (!course) {
      console.log('Course not found')
      return response.status(404).send('Course not found')
    }
    await Chapter.create({
      chapterName: request.body.chapterName,
      chapterDescription: request.body.chapterDescription,
      courseId: request.body.courseId
    })

    console.log('New Chapter added successfully')
    response.redirect(`/chapters/${request.body.courseId}`)
  } catch (error) {
    console.error('Error creating a chapter', error)
    response.status(422).json(error)
  }
})
// Page Routes
app.get('/page', connectEnsureLogin.ensureLoggedIn(), (request, response) => {
  console.log('Available pages')
})
app.post('/page/:chapterId', connectEnsureLogin.ensureLoggedIn(), async (request, response) => {
  try {
    const chapterId = parseInt(request.params.chapterId, 10)
    const chapter = await Chapter.findByPk(chapterId)

    if (!chapter) {
      console.log('Chapter not found')
      return response.status(404).send('Chapter not found')
    }

    await Page.create({
      title: request.body.title,
      content: request.body.content,
      chapterId // Use the courseId from URL parameters
    })

    console.log('New Page added successfully')
    response.redirect(`/pages/${chapterId}`)
  } catch (error) {
    console.error('Error creating a page', error)
    response.status(422).json(error)
  }
})
app.get('/pages/:chapterId', connectEnsureLogin.ensureLoggedIn(), async (request, response) => {
  try {
    const chapterId = request.params.chapterId
    const chapter = await Chapter.findByPk(chapterId)
    const pages = await Page.findAll({
      where: { chapterId }
    })

    response.render('page', { chapter, pages, csrfToken: request.csrfToken() })
  } catch (error) {
    console.error('Error while rendering Pages page', error)
    response.status(500).json({ error: 'Internal Server Error' })
  }
})
app.post('/page', connectEnsureLogin.ensureLoggedIn(), async (request, response) => {
  console.log('Creating a page', request.body)
  try {
    const chapter = await Course.findByPk(request.body.chapterId)

    if (!chapter) {
      console.log('Chapter not found')
      return response.status(404).send('Chapter not found')
    }
    await Page.create({
      title: request.body.title,
      content: request.body.content,
      chapterId: request.body.chapterId
    })
    console.log('New Page added Successfully')
    response.redirect(`/pages/${request.body.chapterId}`)
  } catch (error) {
    console.log(error)
    return response.status(422).json(error)
  }
})
app.put('page/:id/markAsCompleted', connectEnsureLogin.ensureLoggedIn(), (request, response) => {
  console.log(
    'We have to update a page as Completed with ID:',
    request.params.id
  )
})

module.exports = app
