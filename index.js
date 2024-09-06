//below are installed with necessary tools to build Api
const express = require("express")
const path = require("path")
const {open} = require("sqlite")
const sqlite3 = require("sqlite3").verbose()
const bodyParser = require('body-parser')
const app = express();
const bcrypt = require('bcrypt')
const jwt =  require('jsonwebtoken')
const dbPath = path.join(__dirname,"gameblog.db")
const cors = require("cors")
app.use(cors())
app.use(express.json())
app.use(bodyParser.json())
let db = null;

//initialze the dataBase
const initializeDbAndServer = async()=>{
    try{
        db= await open({
            filename:dbPath,
            driver:sqlite3.Database
        });
        app.listen(4000,()=>{
            console.log(`Server is listening http://localhost:4000`);
        })
    }
    catch(error){
        console.log(`DB error : ${e.message}`)
        process.exit(1)
    }
}

initializeDbAndServer()

//in order to access user resources authentication is generated using jwtToken and wit playload has the data of the user
const authenticationToken = (request,response,next)=>{
    let jwtToken;
    const authHeader = request.headers["authorization"];
    if(authHeader !== undefined){
        jwtToken = authHeader.split(" ")[1]
    }
    if(authHeader == undefined){
        response.status(400)
        response.send("No Access Token")
    }
    else{
        jwt.verify(jwtToken,"assigned",(error,payload)=>{
            if(error){
                response.send("Invalid Access Token")
            }
            else{
                request.user_id = payload.id
                request.username = payload.username
                next()
            }
        })
    }
}

//used for registration
app.post("/register",async(request,response)=>{
    const {username,password} = request.body
    const newUserQuery = `SELECT * FROM users WHERE username="${username}";`
    const checkUser = await db.get(newUserQuery)
    const hashPassword = await bcrypt.hash(password,10)
    if(checkUser === undefined){
        const newUser = `INSERT INTO users(username,password)
        VALUES ("${username}","${hashPassword}")
        `
        await db.run(newUser)
        response.send("User created successfully")
    }
    else{
        response.status(400)
        response.send("User already exits")
    }
})

//used for Login
app.post("/login",async(request,response)=>{
    const {username,password} = request.body
    const userQuery = `
    SELECT * FROM users WHERE username="${username}"
    `
    const dbUser = await db.get(userQuery)
    if(dbUser === undefined){
        response.status(400)
        response.send("Invalid user")
    }
    else{
        const isPasswordMatched = await bcrypt.compare(password,dbUser.password)
        if(isPasswordMatched === true){
            const payload = {id:dbUser.id,username:username}
            const jwtToken = jwt.sign(payload,"assigned")
            response.send({jwtToken})
        }
        else{
            response.status(400)
            response.send("Invalid password")
        }
    }

})

//use to map the blog details
const blogDetails = (eachBlog)=>{
    return{
            id:eachBlog.id,
            user_id:eachBlog.user_id,
            title:eachBlog.title,
            genre:eachBlog.genre,
            content:eachBlog.content,
            published_by:eachBlog.published_by,
            published_date:eachBlog.published_date,
            published_time:eachBlog.published_time,
            image_url:eachBlog.image_url,
            video_url:eachBlog.video_url,
            company:eachBlog.company,
            official_website:eachBlog.official_website,
    }
}

//use to map the commentDetails
const commentDetails = (eachComment)=>{
    return{
        id:eachComment.id,
        user_id:eachComment.user_id,
        blog_id:eachComment.blog_id,
        username:eachComment.username,
        comment:eachComment.comment,
        comment_date:eachComment.comment_date
    }
}

app.get("/posts",async(request,response)=>{
    const {title=''} = request.query
    const getPosts = `SELECT * FROM blog WHERE title LIKE "${title}%";`
    const responseBlogs = await db.all(getPosts)
    response.send(responseBlogs.map(eachBlog=>blogDetails(eachBlog)))
})

app.get("/userAuthenticatePosts",authenticationToken,async(request,response)=>{
    const {user_id} = request
    const getPosts = `SELECT * FROM blog WHERE user_id = ${user_id};`
    const responseBlogs = await db.all(getPosts)
    response.send(responseBlogs.map(eachBlog=>blogDetails(eachBlog)))
})

app.get("/posts/:id",async(request,response)=>{
    const {id} = request.params
    const getPost = `SELECT * FROM blog WHERE id = ${id};`
    const responseBlogs = await db.all(getPost)
    response.send(responseBlogs.map(eachBlog=>blogDetails(eachBlog)))
})

app.post("/posts",authenticationToken,async(request,response)=>{
    const date = new Date()
    let exactSeconds;
    let exactMinutes;
    if(date.getSeconds() <= 9){
        exactSeconds = "0"+`${date.getSeconds()}`
    }
    if(date.getMinutes() <= 9){
        exactMinutes = "0"+`${date.getMinutes()}`
    }
    if(date.getSeconds() > 9){
        exactSeconds = date.getSeconds()
    }
    if(date.getMinutes() > 9){
        exactMinutes = date.getMinutes()
    }
    const exactDate = `${date.getDate()}`+"/"+`${date.getMonth()}`+"/"+`${date.getFullYear()}`
    const exactTime = `${date.getHours()}`+":"+`${exactMinutes}`+":"+`${exactSeconds}`
    const {user_id,username} = request
    const {title,genre,content,image_url,video_url,company,official_website} = request.body
    const postBlog = `INSERT INTO blog(user_id,title,genre,content,published_by,published_date,published_time,image_url,video_url,company,
    official_website) VALUES (${user_id},"${title}","${genre}","${content}","${username}","${exactDate}","${exactTime}","${image_url}",
    "${video_url}","${company}","${official_website}");`
    await db.run(postBlog)
    const getPosts = "SELECT * FROM blog"
    const responseBlogs = await db.all(getPosts)
    response.send(responseBlogs.map(eachBlog=>blogDetails(eachBlog)))
})

app.put("/posts/:id",authenticationToken,async(request,response)=>{
    const date = new Date()
    let exactSeconds;
    let exactMinutes;
    if(date.getSeconds() <= 9){
        exactSeconds = "0"+`${date.getSeconds()}`
    }
    if(date.getMinutes() <= 9){
        exactMinutes = "0"+`${date.getMinutes()}`
    }
    if(date.getSeconds() > 9){
        exactSeconds = date.getSeconds()
    }
    if(date.getMinutes() > 9){
        exactMinutes = date.getMinutes()
    }
    const exactDate = `${date.getDate()}`+"/"+`${date.getMonth()}`+"/"+`${date.getFullYear()}`
    const exactTime = `${date.getHours()}`+":"+`${exactMinutes}`+":"+`${exactSeconds}`
    const {user_id,username} = request
    const {id} = request.params
    const {title,genre,content,image_url,video_url,company,official_website} = request.body
    const updateQuery = `UPDATE blog SET user_id = ${user_id}, title = "${title}", genre = "${genre}", content = "${content}",
    published_by = "${username}", published_date = "${exactDate}", published_time = "${exactTime}", image_url = "${image_url}",
    video_url = "${video_url}",company = "${company}", official_website = "${official_website}" WHERE id = ${id};`
    await db.run(updateQuery)
    const getPosts = `SELECT * FROM blog`
    const responseBlogs = await db.all(getPosts)
    response.send(responseBlogs.map(eachBlog=>blogDetails(eachBlog)))
})

app.get("/posts/:id/comments",authenticationToken,async(request,response)=>{
    const {id} = request.params
    const getCommentQuery = `SELECT * FROM comments WHERE blog_id = ${id}`
    const responseComments = await db.all(getCommentQuery)
    response.send(responseComments.map(eachComment=> commentDetails(eachComment)))
})
app.get("/comments/:id",authenticationToken,async(request,response)=>{
    const {id} = request.params
    const getCommentQuery = `SELECT COUNT(*) as comments_count FROM comments WHERE blog_id = ${id}`
    const responseComments = await db.get(getCommentQuery)
    response.send(responseComments)
})
app.post("/posts/:id/comments",authenticationToken,async(request,response)=>{
    const {user_id,username} = request
    const {id} = request.params
    const date = new Date()
    const {comment} = request.body
    const postCommentQuery = `
    INSERT INTO comments (user_id,blog_id,username,comment,comment_date) 
    VALUES (${user_id},${id},"${username}","${comment}","${date}")
    `
    await db.run(postCommentQuery)
    const getComments = `SELECT * FROM comments WHERE blog_id = ${id}`
    const responseComments = await db.all(getComments)
    response.send(responseComments.map(eachComment=>commentDetails(eachComment)))
})
app.delete("/comments/:id",authenticationToken,async(request,response)=>{
    const {id} = request.params
    const deleteComment = `DELETE FROM comments WHERE id = ${id}`
    await db.run(deleteComment)
    const getCommentQuery = `SELECT * FROM comments WHERE id = ${id}`
    const responseComments = await db.all(getCommentQuery)
    response.send(responseComments.map(eachComment=> commentDetails(eachComment)))
})
app.delete("/posts/:id",authenticationToken,async(request,response)=>{
    const {id} = request.params
    const deletePost = `DELETE FROM blog WHERE id = ${id}`
    await db.run(deletePost)
    const getPosts = `SELECT * FROM blog`
    const responseBlogs = await db.all(getPosts)
    response.send(responseBlogs.map(eachBlog=>blogDetails(eachBlog)))
})

module.exports = app
 