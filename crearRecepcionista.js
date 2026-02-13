const bcrypt = require("bcrypt");

(async () => {
  const passwordPlano = "123456"; // ← ESTA será la contraseña real
  const hash = await bcrypt.hash(passwordPlano, 10);

  console.log("HASH:", hash);
})();