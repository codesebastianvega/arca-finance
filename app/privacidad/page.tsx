import type { Metadata } from "next";
import { LegalPage, LegalSection } from "@/src/components/legal-page";

export const metadata: Metadata = {
  title: "Política de Privacidad | Arca",
  description: "Política de privacidad de Arca Finanzas.",
};

export default function PrivacyPage() {
  return (
    <LegalPage
      eyebrow="Privacidad"
      title="Política de Privacidad"
      description="Esta política explica qué información usa Arca, para qué la utiliza y qué opciones tienes sobre tus datos."
    >
      <LegalSection title="1. Responsable">
        <p>Arca Finanzas es responsable del tratamiento de la información utilizada por la aplicación. Puedes contactarnos en arcafinanzas26@gmail.com.</p>
      </LegalSection>

      <LegalSection title="2. Información que recopilamos">
        <p>Al iniciar sesión con Google recibimos los datos básicos autorizados, como nombre, correo electrónico, foto e identificador de cuenta. No recibimos tu contraseña de Google.</p>
        <p>También tratamos la información financiera que registras voluntariamente, como cuentas, saldos, movimientos, ingresos, gastos, obligaciones, presupuestos y metas; además de datos técnicos necesarios para seguridad, funcionamiento y notificaciones.</p>
      </LegalSection>

      <LegalSection title="3. Cómo usamos la información">
        <p>Usamos tus datos para autenticarte, prestar las funciones de Arca, calcular resúmenes y proyecciones, generar recomendaciones con Nova, enviar recordatorios solicitados, atender soporte y proteger la plataforma.</p>
      </LegalSection>

      <LegalSection title="4. Servicios de terceros">
        <p>Arca utiliza proveedores de infraestructura, autenticación, almacenamiento, analítica y procesamiento de inteligencia artificial. Solo compartimos la información necesaria para prestar cada servicio y no vendemos tus datos personales.</p>
      </LegalSection>

      <LegalSection title="5. Conservación y seguridad">
        <p>Conservamos la información mientras tu cuenta permanezca activa o durante el tiempo necesario para cumplir obligaciones legales. Aplicamos medidas razonables para protegerla, aunque ningún sistema es completamente infalible.</p>
      </LegalSection>

      <LegalSection title="6. Tus derechos">
        <p>Puedes solicitar acceso, corrección, actualización o eliminación de tus datos, así como retirar autorizaciones, escribiendo a arcafinanzas26@gmail.com. También puedes revocar el acceso desde la configuración de tu cuenta de Google.</p>
      </LegalSection>

      <LegalSection title="7. Cambios a esta política">
        <p>Podemos actualizar esta política cuando cambien las funciones o requisitos legales. Publicaremos la versión vigente en esta misma página.</p>
      </LegalSection>
    </LegalPage>
  );
}
