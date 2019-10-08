const db = require("./db");
const bodyParser = require("body-parser");
const cookieSession = require("cookie-session");
const csurf = require("csurf");
const handlebars = require("express-handlebars");
const express = require("express");
const app = express();

app.engine("handlebars", handlebars());
app.set("view engine", "handlebars");

app.use(express.static("public"));

app.use(bodyParser.urlencoded({ extended: false }));
app.use(
    cookieSession({
        keys: [`coriander-petition-filippoguida-secret`],
        maxAge: 1000 * 60 * 60 * 24 * 14 //2 weeks
    })
);

app.use(csurf());
app.use((req, res, next) => {
    res.set("x-frame-options", "DENY");
    res.locals.csrfToken = req.csrfToken();
    next();
});

app.get("/login", (req, res) => {
    if (!req.session.id) res.render("login");
    else res.redirect("/petition");
});

app.get("/registration", (req, res) => {
    if (!req.session.id) res.render("registration");
    else res.redirect("/petition");
});

app.post("/login", (req, res) => {
    db.getUserToken(req.body, {
        success: id => {
            req.session.id = id;
            res.redirect("/petition");
        },
        error: () => res.render("login", { error: true })
    });
});

app.post("/registration", (req, res) => {
    db.addUser(req.body, {
        success: id => {
            req.session.id = id;
            res.redirect("/petition");
        },
        error: () => res.render("registration", { error: true })
    });
});

app.get("/petition", (req, res) => {
    if (!req.session.id) res.redirect("/registration");
    else if (req.session.signature) res.redirect("/thanks");
    else res.render("petition");
});

app.post("/petition", (req, res) => {
    db.getSignature(req.session.id, {
        success: signature => (req.session.signature = signature),
        error: db.addSignature(req.body, {
            success: signature => {
                req.session.signature = signature;
                res.redirect("/thanks");
            },
            error: () => res.render("petition", { error: true })
        })
    });
});

app.get("/thanks", (req, res) => {
    console.log(req.session.id);
    if (!req.session.id) res.redirect("/registration");
    else if (!req.session.signature) res.redirect("/petition");
    else res.render("thanks", { session: req.session.signature });
});

app.get("/signers", (req, res) => {
    if (!req.session.id) res.redirect("/registration");
    else if (!req.session.signature) res.redirect("/petition");
    else
        db.getSigners({
            success: signers => res.render("signers", { signers }),
            error: () => res.sendStatus(500)
        });
});

app.listen(8080, () => {
    console.log("Server is listening on port 8080");
});
