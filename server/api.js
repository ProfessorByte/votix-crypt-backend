import express from "express";
import { auth, db } from "./database.js";
import { ENUMERATOR } from "./roles.js";
import { generatePassword } from "./util.js";

const router = express.Router();

router.post("/enroll-enumerator", async (req, res) => {
  try {
    const idToken = req.headers.authorization.split(" ")[1];
    const decodedToken = await auth.verifyIdToken(idToken);
    const uid = decodedToken.uid;

    const { adminId, ci, email } = req.body;

    if (uid === adminId) {
      const personRef = db.collection("voter-data").doc(ci);
      const personDoc = await personRef.get();

      if (!personDoc.exists) {
        res.status(400).json({ message: "Persona no encontrada" });
        return;
      }
      const personData = personDoc.data();
      if (!personData.qualifiedToVote) {
        res.status(400).json({ message: "Persona no calificada para votar" });
        return;
      }
      const registerData = {
        email: email,
        password: generatePassword(16),
      };
      const userRecord = await auth.createUser(registerData);
      const collectionRef = db.collection("users");
      const data = {
        name: personData.name,
        ci,
        role: ENUMERATOR,
      };
      await collectionRef.doc(userRecord.uid).set(data);

      console.log("Correo enviado:", registerData); // TODO: Send email

      res.json({
        message: "Empadronador inscrito, favor de revisar el correo registrado",
      });
      return;
    }

    res.status(401).json({ message: "Acción no permitida" });
  } catch (error) {
    console.error(error);
    res.status(401).json({ message: "Acción no permitida" });
  }
});

export default router;
