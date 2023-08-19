import express from "express";
import dotenv from "dotenv";
import CryptoJS from "crypto-js";
import * as paillierBigint from "paillier-bigint";
import { ADVANCED_ADMINISTRATOR, ENUMERATOR, VOTER } from "./roles.js";
import { enrollPerson, transformString } from "./util.js";
import { auth, db } from "./database.js";
import { RECIDENCE_PLACES } from "./consts.js";

dotenv.config();

const router = express.Router();

router.post("/enroll-enumerator", async (req, res) => {
  enrollPerson(req, res, ENUMERATOR);
});

router.post("/enroll-voter", async (req, res) => {
  enrollPerson(req, res, VOTER);
});

router.post("/process-results", async (req, res) => {
  try {
    const idToken = req.headers.authorization.split(" ")[1];
    const decodedToken = await auth.verifyIdToken(idToken);
    const { uid } = decodedToken;

    const { userId } = req.body;

    const personRef = db.collection("users").doc(uid);
    const personDoc = await personRef.get();

    if (!personDoc.exists) {
      res.status(401).json({ message: "Persona no encontrada" });
      return;
    }
    const personData = personDoc.data();

    if (uid === userId && personData.role === ADVANCED_ADMINISTRATOR) {
      const usersRef = db.collection("users");
      const usersQuery = usersRef.where("role", "in", [ENUMERATOR, VOTER]);
      const usersSnapshot = await usersQuery.get();

      const electionsRef = db.collection("elections");
      const electionsQuery = electionsRef.where("current", "==", true);
      const electionsSnapshot = await electionsQuery.get();

      const candidatesRef = db.collection("candidates");
      const candidatesSnapshot = await candidatesRef.get();

      if (candidatesSnapshot.empty) {
        res.status(401).json({ message: "No hay candidatos registrados" });
        return;
      }

      if (electionsSnapshot.empty) {
        res.status(401).json({ message: "No hay elecciones activas" });
        return;
      }

      const candidates = [];

      candidatesSnapshot.forEach((candidateDoc) => {
        const candidateData = candidateDoc.data();
        candidates.push({
          id: candidateDoc.id,
          nameId: transformString(candidateData.name),
          ...candidateData,
        });
      });

      res.json({ message: "Procesando resultados internamente" });
      const currentElection = electionsSnapshot.docs[0].data();

      const pkBytes = CryptoJS.AES.decrypt(
        currentElection.privateKey,
        process.env.PASSWORD_PRIVATE_KEY
      );
      const decryptedPkData = JSON.parse(pkBytes.toString(CryptoJS.enc.Utf8));

      const publicKey = new paillierBigint.PublicKey(
        BigInt(currentElection.publicKey.n),
        BigInt(currentElection.publicKey.g)
      );
      const privateKey = new paillierBigint.PrivateKey(
        BigInt(decryptedPkData.lambda),
        BigInt(decryptedPkData.mu),
        publicKey
      );

      const votesLists = {};

      RECIDENCE_PLACES.forEach((recidencePlace) => {
        votesLists[recidencePlace] = candidates
          .map((candidate) => candidate.id)
          .reduce((acc, id) => {
            acc[id] = [];
            return acc;
          }, {});
      });

      usersSnapshot.forEach((userDoc) => {
        const userData = userDoc.data();

        const userVotesHSum = userData.vote
          ? publicKey.addition(...Object.values(userData.vote).map(BigInt))
          : null;
        const userVotesSum = userVotesHSum
          ? privateKey.decrypt(userVotesHSum)
          : 0n;
        if (userVotesSum === 1n) {
          Object.keys(userData.vote).forEach((candidateId) => {
            votesLists[userData.recidencePlace][candidateId].push(
              userData.vote[candidateId]
            );
          });
        }
      });

      const results = Object.keys(votesLists).map((recidencePlace) => ({
        name: recidencePlace,
        ...Object.keys(votesLists[recidencePlace]).reduce(
          (acc, candidateId) => {
            acc[
              candidates.find(
                (candidate) => candidate.id === candidateId
              ).nameId
            ] =
              votesLists[recidencePlace][candidateId].length > 0
                ? Number(
                    privateKey.decrypt(
                      publicKey.addition(
                        ...votesLists[recidencePlace][candidateId].map(BigInt)
                      )
                    )
                  )
                : 0;
            return acc;
          },
          {}
        ),
      }));

      electionsSnapshot.docs[0].ref.update({
        results,
        candidates,
      });
    }
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error al procesar los resultados" });
  }
});

router.get("/verify-vote/:ci", async (req, res) => {
  const { ci } = req.params;

  const electionsRef = db.collection("elections");
  const electionsQuery = electionsRef.where("current", "==", true);
  const electionsSnapshot = await electionsQuery.get();

  const usersRef = db.collection("users");
  const usersQuery = usersRef.where("ci", "==", ci);
  const usersSnapshot = await usersQuery.get();

  if (electionsSnapshot.empty) {
    res.status(401).json({ message: "No hay elecciones activas" });
    return;
  }

  if (usersSnapshot.empty) {
    res.status(401).json({ message: "Persona no encontrada" });
    return;
  }

  const currentPersonData = usersSnapshot.docs[0].data();

  if (!currentPersonData.vote) {
    res.json({ message: "Voto no encontrado" });
    return;
  }

  const currentElection = electionsSnapshot.docs[0].data();

  const pkBytes = CryptoJS.AES.decrypt(
    currentElection.privateKey,
    process.env.PASSWORD_PRIVATE_KEY
  );
  const decryptedPkData = JSON.parse(pkBytes.toString(CryptoJS.enc.Utf8));

  const publicKey = new paillierBigint.PublicKey(
    BigInt(currentElection.publicKey.n),
    BigInt(currentElection.publicKey.g)
  );
  const privateKey = new paillierBigint.PrivateKey(
    BigInt(decryptedPkData.lambda),
    BigInt(decryptedPkData.mu),
    publicKey
  );

  const userVotesHSum = publicKey.addition(
    ...Object.values(currentPersonData.vote).map(BigInt)
  );
  const userVotesSum = userVotesHSum ? privateKey.decrypt(userVotesHSum) : 0n;

  if (userVotesSum === 1n) {
    res.json({ message: "Voto válido" });
    return;
  }
});

export default router;
