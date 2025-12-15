import express from "express";
import jwt from "jsonwebtoken";

export default function crearLoginRoute(usuariosCollection) {
  const router = express.Router();

  router.post("/", async (req, res) => {
    try {
      const { user, password } = req.body;

      if (!user || !password) {
        return res.status(400).json({ error: "Faltan datos de login" });
      }

      const usuario = await usuariosCollection.findOne({ user });

      if (!usuario) {
        return res.status(401).json({ error: "Usuario no encontrado" });
      }

      if (usuario.password !== password) {
        return res.status(401).json({ error: "Contraseña incorrecta" });
      }

      const token = jwt.sign(
        { id: usuario._id, user: usuario.user, tipo: usuario.tipo },
        "secreto-super-seguro",
        { expiresIn: "1h" }
      );

      return res.json({
        mensaje: "Login correcto",
        token,
        usuario: {
          user: usuario.user,
          email: usuario.email,
          tipo: usuario.tipo,
        },
      });
    } catch (err) {
      console.error("Error en /login:", err);
      return res.status(500).json({ error: "Error interno en login" });
    }
  });

  return router;
}
