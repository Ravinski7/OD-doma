const express = require("express");
const router = express.Router();
const { authRequired, adminRequired } = require("../services/auth.js");
const Joi = require("joi");
const { db } = require("../services/db.js");




// GET /competitions
router.get("/", authRequired, function (req, res, next) {
    const stmt = db.prepare(`
        SELECT c.id, c.name, c.description, u.name AS author, c.apply_till
        FROM competitions c, users u
        WHERE c.author_id = u.id
        ORDER BY c.apply_till
    `);
    const result = stmt.all();

    res.render("competitions/index", { result: { items: result } });
});

// GET /participants
router.get("/", authRequired, function (req, res, next) {
    const stmt = db.prepare(`
        SELECT p.Participant_id, p.User_id, p.Score, p.Competition_id, p.Date_of_competition
        FROM participants p, users u
        WHERE p.User_id = u.id
        ORDER BY p.Participant_id
    `);
    const result = stmt.all();

    res.render("competitions/score", {result:{items: result}});

});

//Get /competitions/login/:id

router.get("/login/:id", function(req, res, next){

    const result = schema_id.validate(req.params);
    if (result.error) {
        throw new Error("Neispravan poziv");
    }

    const stmt = db.prepare(
        "INSERT INTO participants (User_id, Competition_id) VALUES (?, ?);"
    );

    const checkStmt = db.prepare(
        "SELECT * FROM participants WHERE User_id = ? AND Competition_id = ?;"
    );

    const exsistingSignUp = checkStmt.get(req.user.sub, req.params.id);
     
    if(exsistingSignUp){
        res.render("competitions/prijava", {result:{alreadySignedUp: true}})
    }

    if(!exsistingSignUp){

    const signUpResult = stmt.run(req.user.sub, req.params.id);

    if(signUpResult.changes && signUpResult.changes === 1){
        res.render("competitions/prijava", {result: {signedUp: true}});
    }else{
        res.render("competitions/prijava", {result: {database_error: true}});
    }

}else{
    res.render("competitions/prijava", {result: {database_error: true}});
}
    
});


// GET /competitions/score/:id
router.get("/score/:id", function (req, res, next) {
    // do validation
    const result = schema_id.validate(req.params);
    if (result.error) {
      throw new Error("Neispravan poziv");
    }
  
    const stmt = db.prepare(
        `
        SELECT u.name AS name, p.Participant_id AS participant, p.Date_of_competition, p.Score, c.name AS competition
        FROM participants p JOIN users u ON p.User_id = u.id JOIN competitions c ON p.Competition_id = c.id WHERE c.id = ? 
        ORDER BY p.Score DESC
        `
      );
    const dbResult = stmt.all(req.params.id);

    res.render("competitions/score", { result: { items: dbResult } });
  });
  
  // POST /competitions/score/:id
  router.post("/score/:id", authRequired, function (req, res, next) {
    // do validation
    const result = schema_id.validate({ id: req.params.id }); // Validacija ID-a
    if (result.error) {
      throw new Error("Neispravan poziv");
    }
  
    const score = parseInt(req.body.score);
  
    if (isNaN(score)) {
      res.render("competitions/score", {
        result: { validation_error: true },
      });
      return;
    }
  
    const stmt = db.prepare("UPDATE participants SET score = ? WHERE id = ?;");
    const updateResult = stmt.run(score, req.params.id); 
  
    if (updateResult.changes && updateResult.changes === 1) {
      res.redirect("/competitions");
    } else {
      res.render("/competitions/form", {
        result: { database_error: true },
      });
      return;
    }
  });







//POST /competitions/list/:id
router.post("/list/:id", function (req, res, next){

   

    res.render("../Lista/list/list");
    
    res.locals.NotShHead = true;
});

//GET /competitions/list
router.get("/list/:id", function (req, res, next) {
   
    const stmt = db.prepare(
        `
        SELECT u.name AS name, p.Participant_id AS participant, p.Date_of_competition, p.Score, c.name AS competition
        FROM participants p JOIN users u ON p.User_id = u.id JOIN competitions c ON p.Competition_id = c.id WHERE c.id = ? 
        ORDER BY p.Score DESC
        `
      );
    const dbResult = stmt.all(req.params.id);

    res.render("../Lista/list/list", { result: { items: dbResult } });

    res.locals.NotShHead = true;

    
    
  });

  router.get("/korisnici", function (req, res, next) {
   
    const stmt = db.prepare(
        `
        SELECT u.id AS ID, u.name AS name, u.verified AS verified
        FROM  users u  
        
        `
      );
    const dbResult = stmt.all();



    res.render("../korisnici/korisnici", { result: { items: dbResult } });


  });


  router.post("/verify/:id", function (req, res, next) {
   
    const stmt = db.prepare("UPDATE users SET verified = 1 WHERE ID = ?");
    stmt.run(verified, req.params.id);

    const dbResult = stmt.all();

    res.render("../korisnici/korisnici", { result: { items: dbResult } });

  });

  router.post("/UNveryfi/:id", function (req, res, next) {
   
    const stmt = db.prepare("UPDATE users SET verified = 0 WHERE ID = ?");
    stmt.run(verified, req.params.id);

    const dbResult = stmt.all();

    res.render("../korisnici/korisnici", { result: { items: dbResult } });

  });

  

















// SCHEMA id
const schema_id = Joi.object({
    id: Joi.number().integer().positive().required()
});

// GET /competitions/delete/:id
router.get("/delete/:id", adminRequired, function (req, res, next) {
    // do validation
    const result = schema_id.validate(req.params);
    if (result.error) {
        throw new Error("Neispravan poziv");
    }

    const stmt = db.prepare("DELETE FROM competitions WHERE id = ?;");
    const deleteResult = stmt.run(req.params.id);

    if (!deleteResult.changes || deleteResult.changes !== 1) {
        throw new Error("Operacija nije uspjela");
    }

    res.redirect("/competitions");
});



// GET /competitions/edit/:id
router.get("/edit/:id", adminRequired, function (req, res, next) {
    // do validation
    const result = schema_id.validate(req.params);
    if (result.error) {
        throw new Error("Neispravan poziv");
    }

    const stmt = db.prepare("SELECT * FROM competitions WHERE id = ?;");
    const selectResult = stmt.get(req.params.id);

    if (!selectResult) {
        throw new Error("Neispravan poziv");
    }

    res.render("competitions/form", { result: { display_form: true, edit: selectResult } });
});


// POST /competitions/edit
router.post("/edit/", adminRequired, function (req, res, next) {
    // do validation
    const result = schema_edit.validate(req.body);
    if (result.error) {
        res.render("competitions/form", { result: { validation_error: true, display_form: true } });
        return;
    }

    const stmt = db.prepare("UPDATE competitions SET name = ?, description = ?, apply_till = ? WHERE id = ?;");
    const updateResult = stmt.run(req.body.name, req.body.description, req.body.apply_till, req.body.id);

    if (updateResult.changes && updateResult.changes === 1) {
        res.redirect("/competitions");
    } else {
        res.render("competitions/form", { result: { database_error: true } });
    }

});

//SCHEMA edit
const schema_edit = Joi.object({
    id: Joi.number().integer().positive().required(),
    name: Joi.string().min(3).max(50).required(),
    description: Joi.string().min(3).max(1000).required(),
    apply_till: Joi.date().iso().required()
});





// GET /competitions/add
router.get("/add", adminRequired, function (req, res, next) {
    res.render("competitions/form", { result: { display_form: true } });
});


// SCHEMA signup
const schema_add = Joi.object({
    name: Joi.string().min(3).max(50).required(),
    description: Joi.string().min(3).max(1000).required(),
    apply_till: Joi.date().iso().required()
});

// POST /competitions/add
router.post("/add", adminRequired, function (req, res, next) {
    // do validation
    const result = schema_add.validate(req.body);
    if (result.error) {
        res.render("competitions/form", { result: { validation_error: true, display_form: true } });
        return;
    }

    const stmt = db.prepare("INSERT INTO competitions (name, description, author_id, apply_till) VALUES (?, ?, ?, ?);");
    const insertResult = stmt.run(req.body.name, req.body.description, req.user.sub, req.body.apply_till);

    if (insertResult.changes && insertResult.changes === 1) {
        res.render("competitions/form", { result: { success: true } });
    } else {
        res.render("competitions/form", { result: { database_error: true } });
    }
});







module.exports = router;