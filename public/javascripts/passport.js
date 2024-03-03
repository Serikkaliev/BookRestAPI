    const jwt = require("jsonwebtoken");

    exports.cookieJwtAuth = (req, res, next) => {
      const token = req.cookies.token;
      try {
        
        const user = jwt.verify(token, "Sagi SE-2230");
        
        console.log(req.user)
        req.user = user;
        next();
      } catch (err) {
        res.clearCookie("token");
        return res.redirect("/");
      }
    };

    exports.isAdmin = (req, res, next) => {
      if (!req.user || !req.user.check.isAdmin) {
        // Пользователь не администратор
        return res.status(403).send("У вас нет прав доступа к этой странице");
      }
      next();
    };