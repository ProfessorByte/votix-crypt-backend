import { Resend } from "resend";
import dotenv from "dotenv";

dotenv.config();

export const generatePassword = (length) => {
  let result = "";
  const characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+";
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.round(Math.random() * characters.length));
  }
  return result;
};

const resend = new Resend(process.env.RESEND_APIKEY);
export const sendEmail = async (email, password) => {
  const data = await resend.emails.send({
    from: "VotixCrypt <votix.crypt@resend.dev>",
    to: email,
    subject: "Nueva cuenta en VotixCrypt",
    html: `<p>Se ha creado una cuenta para usted en VotixCrypt. Puede acceder con estos credenciales:</p>
           <strong>Correo electrónico: ${email}</strong>
           <strong>Contraseña: ${password}</strong>`,
  });

  return data;
};
