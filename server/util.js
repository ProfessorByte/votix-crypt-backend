import { ADMINISTRATOR, ENUMERATOR, VOTER } from "./roles.js";
import { auth, db } from "./database.js";

export const generatePassword = (length) => {
  let result = "";
  const characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+";
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.round(Math.random() * characters.length));
  }
  return result;
};

const verifyAuth = {
  [ENUMERATOR]: async (uid) => {
    const userRef = db.collection("users").doc(uid);
    const userDoc = await userRef.get();
    if (!userDoc.exists) {
      return false;
    }
    const userData = userDoc.data();
    return userData.role === ADMINISTRATOR;
  },
  [VOTER]: async (uid) => {
    const userRef = db.collection("users").doc(uid);
    const userDoc = await userRef.get();
    if (!userDoc.exists) {
      return false;
    }
    const userData = userDoc.data();
    return userData.role === ENUMERATOR;
  },
};

export const enrollPerson = async (req, res, role) => {
  try {
    const idToken = req.headers.authorization.split(" ")[1];
    const decodedToken = await auth.verifyIdToken(idToken);
    const { uid } = decodedToken;

    const { userId, ci, email } = req.body;

    if (uid === userId && (await verifyAuth[role](uid))) {
      const personRef = db.collection("voter-data").doc(ci);
      const personDoc = await personRef.get();

      if (!personDoc.exists) {
        res.status(401).json({ message: "Persona no encontrada" });
        return;
      }
      const personData = personDoc.data();
      if (!personData.qualifiedToVote) {
        res.json({ message: "Error. Persona no calificada para votar" });
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
        recidencePlace: personData.recidencePlace,
        ci,
        role: role,
      };
      await collectionRef.doc(userRecord.uid).set(data);

      res.json({
        message:
          "Inscripción completada, favor de revisar el correo registrado",
        enrolled: true,
      });
      return;
    }

    res.status(401).json({ message: "Acción no permitida" });
  } catch (error) {
    console.error(error);
    res.status(401).json({ message: "Acción no permitida" });
  }
};

export const transformString = (str) => {
  const accents = {
    á: "a",
    Á: "A",
    é: "e",
    É: "E",
    í: "i",
    Í: "I",
    ó: "o",
    Ó: "O",
    ú: "u",
    Ú: "U",
    ü: "u",
    Ü: "U",
  };
  return str
    .replace(/[áÁéÉíÍóÓúÚüÜ]/gi, (match) => accents[match])
    .replace(/[\s\n]/g, "");
  // .toUpperCase();
};
