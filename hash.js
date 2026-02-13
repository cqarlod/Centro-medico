const bcrypt = require('bcrypt');

async function generarHash() {
  const password = '123456'; // contraseña que quieras
  const hash = await bcrypt.hash(password, 10);
  console.log('Hash:', hash);
}

generarHash();
