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
export const sendEmail = async (name, email, password) => {
  const data = await resend.emails.send({
    from: "VotixCrypt <votix.crypt@resend.dev>",
    to: email,
    subject: "Nueva cuenta en VotixCrypt",
    html: `
    <h1>Bienvenido a VotixCrypt</h1>
    <p>Hola ${name},</p>
    <p>
      Gracias por registrarte en VotixCrypt, la plataforma de voto electrónico
      que te permite elegir a tu candidato preferido desde cualquier lugar.
    </p>
    <p>Tus credenciales son las siguientes:</p>
    <p><strong>Correo electrónico:</strong> ${email}</p>
    <p><strong>Contraseña:</strong> ${password}</p>
    <p>
      Te recomendamos que cambies tu contraseña lo antes posible por una igual
      de segura, pero más fácil de recordar.
    </p>
    <p>
      Esperamos que disfrutes de VotixCrypt y que puedas elegir a tu candidato
      preferido.
    </p>
    <p>Saludos,</p>
    <p>El equipo de VotixCrypt.</p>`,
  });

  return data;
};
