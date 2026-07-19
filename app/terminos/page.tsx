import type { Metadata } from "next";
import { LegalPage, LegalSection } from "@/src/components/legal-page";

export const metadata: Metadata = {
  title: "Términos del Servicio | Arca",
  description: "Términos y condiciones de uso de Arca Finanzas.",
};

export default function TermsPage() {
  return (
    <LegalPage
      eyebrow="Condiciones de uso"
      title="Términos del Servicio"
      description="Al crear una cuenta o utilizar Arca aceptas estas condiciones. Léelas antes de continuar."
    >
      <LegalSection title="1. El servicio">
        <p>Arca es una herramienta de organización financiera personal que permite registrar información, consultar resúmenes, planificar compromisos y recibir asistencia mediante Nova.</p>
      </LegalSection>

      <LegalSection title="2. Cuenta y acceso">
        <p>Debes proporcionar información válida, mantener seguro el acceso a tu cuenta y notificarnos si detectas un uso no autorizado. Eres responsable de las acciones realizadas desde tu cuenta.</p>
      </LegalSection>

      <LegalSection title="3. Uso permitido">
        <p>Te comprometes a usar Arca de forma legal y a no intentar vulnerar, interferir, copiar abusivamente o utilizar la plataforma para afectar a otras personas o al servicio.</p>
      </LegalSection>

      <LegalSection title="4. Información y recomendaciones">
        <p>Los cálculos y respuestas de Nova dependen de la información registrada y pueden contener errores. Arca ofrece apoyo informativo y organizativo, no asesoría financiera, contable, tributaria, jurídica ni de inversión. Las decisiones finales son tuyas.</p>
      </LegalSection>

      <LegalSection title="5. Planes y pagos">
        <p>Algunas funciones pueden depender de un plan. Antes de contratar mostraremos el precio, duración y funciones incluidas. La falta de pago puede limitar o suspender el acceso al plan, sin eliminar automáticamente tus datos.</p>
      </LegalSection>

      <LegalSection title="6. Disponibilidad y cambios">
        <p>Trabajamos para mantener Arca disponible, pero no garantizamos funcionamiento ininterrumpido. Podemos actualizar, corregir o modificar funciones para mejorar la seguridad y el servicio.</p>
      </LegalSection>

      <LegalSection title="7. Terminación">
        <p>Puedes dejar de usar Arca y solicitar la eliminación de tu cuenta. También podremos suspender accesos que incumplan estas condiciones o representen un riesgo para la plataforma.</p>
      </LegalSection>

      <LegalSection title="8. Contacto">
        <p>Si tienes preguntas sobre estos términos, escríbenos a arcafinanzas26@gmail.com.</p>
      </LegalSection>
    </LegalPage>
  );
}
