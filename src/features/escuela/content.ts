export interface Story {
  id: string;
  icon: string;
  title: string;
  paragraphs: string[];
  keyTakeaway: string;
}

export interface EscuelaModule {
  id: string;
  title: string;
  description: string;
  emoji: string;
  color: string; // tailwind color token
  stories: Story[];
}

export const ESCUELA_MODULES: EscuelaModule[] = [
  {
    id: 'tarjetas',
    title: 'Tarjetas de Crédito',
    description: 'Aprende a usar el plástico a tu favor, no en tu contra.',
    emoji: '💳',
    color: 'violet',
    stories: [
      {
        id: 'tarjetas_1',
        icon: '📅',
        title: 'Fecha de corte vs. fecha de pago',
        paragraphs: [
          'Muchas personas confunden estas dos fechas y eso les cuesta dinero. La fecha de corte es el día en que el banco "toma la foto" de todo lo que consumiste durante el mes. Todo lo que compres antes de ese día aparece en tu extracto actual.',
          'La fecha de pago, en cambio, es el día límite para pagar ese extracto sin que te cobren intereses. Usualmente cae entre 15 y 20 días después del corte. Si pagas antes de esa fecha el total del extracto, no pagas un peso de interés.',
          'Ejemplo: si tu corte es el 10 de cada mes y tu fecha de pago es el 28, tienes hasta el 28 para pagar lo que consumiste antes del 10. Si compras el 11, esa compra entrará al siguiente corte y tendrás casi 45 días antes de que te la cobren.',
        ],
        keyTakeaway: 'Conoce tus dos fechas. Paga el total antes del vencimiento y los intereses son $0.',
      },
      {
        id: 'tarjetas_2',
        icon: '📊',
        title: 'La regla del 30% del cupo',
        paragraphs: [
          'El cupo de tu tarjeta no es un presupuesto disponible para gastar — es un límite de riesgo. Los expertos en crédito recomiendan no usar más del 30% de tu cupo disponible. Si tu tarjeta tiene un cupo de $5.000.000, lo ideal es que tu deuda nunca supere $1.500.000.',
          'Esto importa por dos razones: la primera es financiera — si usas más del 30%, empiezas a pagar intereses sobre un monto alto y la deuda crece rápido. La segunda es crediticia — el porcentaje de uso del cupo es uno de los factores que más afecta tu score crediticio. Un uso alto te hace ver como un cliente de riesgo.',
          'Si tienes varias tarjetas, el 30% aplica sobre el cupo total sumado. Por ejemplo, si tienes dos tarjetas de $3.000.000 cada una, tu deuda total entre ambas no debería pasar de $1.800.000.',
        ],
        keyTakeaway: 'Usa máximo el 30% de tu cupo total. Más de eso afecta tu score y tus bolsillos.',
      },
      {
        id: 'tarjetas_3',
        icon: '⚠️',
        title: 'La trampa del pago mínimo',
        paragraphs: [
          'Pagar solo el mínimo de tu tarjeta parece cómodo, pero es una de las decisiones más costosas que puedes tomar. El banco diseña el mínimo exactamente para que pagues lo menos posible y ellos ganen lo máximo en intereses.',
          'Si tienes una deuda de $3.000.000 en una tarjeta al 2.5% mensual y solo pagas el mínimo ($90.000), tardarás más de 5 años en saldar esa deuda y habrás pagado cerca de $2.500.000 adicionales solo en intereses — casi el doble de lo que debías.',
          'El truco es simple: paga siempre más que el mínimo. Con $180.000 al mes sobre esa misma deuda la pagas en menos de 2 años y ahorras más de $1.800.000. Mientras más pagues encima del mínimo, menos intereses acumulas.',
        ],
        keyTakeaway: 'El mínimo no paga tu deuda, solo alimenta los intereses del banco. Siempre paga más.',
      },
      {
        id: 'tarjetas_4',
        icon: '🛍️',
        title: 'Cuotas sin interés: úsalas bien',
        paragraphs: [
          'Las cuotas sin interés son una de las mejores herramientas que ofrecen las tarjetas si sabes usarlas. Básicamente el banco te financia una compra sin cobrarte extra, con tal de que pagues la cuota mensual acordada.',
          'La clave está en que cada cuota sin interés que adquieres aumenta tu pago mínimo mensual obligatorio. Si abusas de esta modalidad, puedes terminar con un pago mínimo altísimo que compromete tu flujo de caja mensual, aunque técnicamente no estés pagando intereses.',
          'Úsalas para compras grandes que de todas formas ibas a hacer, y que caben cómodamente en tu presupuesto mensual. Una cuota sin interés de un electrodoméstico necesario es inteligente. Varias cuotas sin interés de compras impulsivas acumuladas pueden ahogarte.',
        ],
        keyTakeaway: 'Cuotas sin interés son tus aliadas si son pocas, planeadas y caben en tu presupuesto.',
      },
      {
        id: 'tarjetas_5',
        icon: '🎯',
        title: 'El truco del ciclo de facturación',
        paragraphs: [
          'Aquí hay un truco que poca gente conoce: si compras el día justo después de tu fecha de corte, tu compra entra al siguiente ciclo. Esto significa que tienes el resto del ciclo actual (aprox. 25-30 días) más el período de gracia (15-20 días) antes de que te la cobren. En total, puedes tener hasta 45 días sin pagar intereses.',
          'Por ejemplo: si tu corte es el 10 y compras el 11, esa compra entra al ciclo que cierra el 10 del siguiente mes. Tu fecha de pago sería el 28 del mes siguiente. Desde el 11 de este mes hasta el 28 del siguiente hay más de 45 días completamente gratis.',
          'Este truco es especialmente útil para compras grandes planeadas. En lugar de comprar el 8, espera al 11 y tendrás 45 días para organizar el dinero sin pagar un peso de interés.',
        ],
        keyTakeaway: 'Compra justo después del corte y ganas hasta 45 días sin intereses para pagar.',
      },
    ],
  },
  {
    id: 'historial',
    title: 'Historial Crediticio',
    description: 'Tu score es tu reputación financiera. Aprende a cuidarlo.',
    emoji: '📊',
    color: 'blue',
    stories: [
      {
        id: 'historial_1',
        icon: '🔢',
        title: '¿Qué es el score crediticio?',
        paragraphs: [
          'El score crediticio es un número, generalmente entre 150 y 950, que resume qué tan confiable eres como pagador. Las centrales de riesgo como Datacrédito y TransUnion en Colombia calculan este número con base en tu comportamiento financiero histórico.',
          'Los bancos y financieras consultan este número cada vez que solicitas un crédito, una tarjeta, un arriendo o incluso un plan de celular pospago. Un score alto te da acceso a mejores tasas de interés, mayores cupos y mejores condiciones. Un score bajo puede significar que te nieguen el crédito o que te cobren tasas altísimas.',
          'Puedes consultar tu score en Datacrédito (datacredito.com.co) o TransUnion. Tienes derecho a una consulta gratuita al mes. Conocer tu número es el primer paso para mejorarlo.',
        ],
        keyTakeaway: 'Tu score es tu reputación financiera. Consúltalo gratis una vez al mes y monitoréalo.',
      },
      {
        id: 'historial_2',
        icon: '⚖️',
        title: 'Los 5 factores que afectan tu score',
        paragraphs: [
          'El score no es un número mágico — se calcula con criterios específicos. Los más importantes en Colombia son: (1) Historial de pagos: ¿pagas a tiempo? Este es el factor más pesado. (2) Nivel de endeudamiento: ¿qué porcentaje de tu cupo usas? (3) Antigüedad del crédito: ¿cuánto tiempo llevas en el sistema financiero? Más tiempo, mejor.',
          '(4) Tipos de crédito: tener variedad entre tarjetas, préstamos y créditos de consumo suma puntos. (5) Solicitudes recientes: cada vez que pides un crédito nuevo, tu score baja un poco temporalmente porque eso se registra como una "consulta dura".',
          'El factor más importante con diferencia es el historial de pagos. Una sola mora reportada puede bajar tu score significativamente y puede tardar hasta 4 años en salir del historial después de ponerte al día.',
        ],
        keyTakeaway: 'Paga a tiempo, usa menos del 30% del cupo y no solicites créditos que no necesitas.',
      },
      {
        id: 'historial_3',
        icon: '😱',
        title: 'El error más costoso: pagar tarde',
        paragraphs: [
          'Un solo pago atrasado puede dañar tu score de forma significativa y el efecto dura años. En Colombia, una mora se reporta a las centrales de riesgo a partir del primer día de retraso. Sin embargo, el impacto más fuerte viene después de 30 días de mora.',
          'Lo que muchos no saben: incluso si te pones al día con el pago atrasado, el reporte de la mora permanece en tu historial por hasta 4 años (el doble del tiempo que duró la mora). Si debías y no pagaste por 2 años, esa mancha queda 4 años más. Eso puede impedirte obtener créditos, arriendo o hasta trabajo en algunos sectores.',
          'El consejo: si sabes que no vas a poder pagar, llama al banco antes del vencimiento. Muchas entidades tienen programas de refinanciación que evitan el reporte negativo si actúas antes de que venza el plazo.',
        ],
        keyTakeaway: 'Si no puedes pagar, llama al banco antes del vencimiento. Una mora puede seguirte 4 años.',
      },
      {
        id: 'historial_4',
        icon: '📈',
        title: 'Cómo subir tu score en 6 meses',
        paragraphs: [
          'Mejorar el score requiere consistencia, no magia. Estas son las acciones con mayor impacto en el corto plazo: Primero, ponte al día con todas las moras pendientes. Mientras tengas deudas vencidas, el score seguirá cayendo. Segundo, no canceles tarjetas de crédito aunque no las uses — la antigüedad del crédito suma puntos. Mejor guárdalas.',
          'Tercero, reduce el uso de tus cupos al 30% o menos. Si debes $2.500.000 en una tarjeta de $3.000.000, intenta abonar hasta bajar ese porcentaje. Cuarto, no solicites varios créditos al mismo tiempo — cada consulta baja el score temporalmente.',
          'Con estas acciones sostenidas durante 6 meses puedes ver mejoras importantes. El score no sube de un mes a otro, pero sí responde progresivamente al buen comportamiento financiero.',
        ],
        keyTakeaway: 'Paga a tiempo, reduce el uso de cupos y ten paciencia. El score mejora con el tiempo.',
      },
      {
        id: 'historial_5',
        icon: '🤔',
        title: 'Cuándo pedir un crédito nuevo',
        paragraphs: [
          'Pedir un crédito en el momento equivocado puede empeorar tu situación financiera en lugar de mejorarla. Antes de solicitar cualquier producto crediticio nuevo, hazte estas preguntas: ¿Tengo claro cómo voy a pagar las cuotas? ¿Mi endeudamiento actual supera el 30-35% de mis ingresos? Si la respuesta es sí, mejor espera.',
          'Hay momentos donde pedir un crédito tiene sentido: cuando la tasa es significativamente menor a la que tienes actualmente (refinanciación), cuando es para invertir en algo que genera ingresos, o cuando es una emergencia real que no tiene otra solución.',
          'Evita pedir créditos para cubrir gastos del día a día, para pagar otras deudas con tasas similares, o para compras de consumo que podrías diferir. El crédito bien usado construye historial; el crédito mal usado construye deudas que se vuelven impagables.',
        ],
        keyTakeaway: 'Pide crédito solo cuando tienes claro cómo pagarlo y para qué lo vas a usar.',
      },
    ],
  },
  {
    id: 'creditos',
    title: 'Créditos Inteligentes',
    description: 'Entiende cómo funcionan los préstamos y úsalos a tu favor.',
    emoji: '🏦',
    color: 'amber',
    stories: [
      {
        id: 'creditos_1',
        icon: '🔍',
        title: 'Tasa nominal vs. tasa efectiva',
        paragraphs: [
          'Cuando un banco te dice "te prestamos al 18% anual", no siempre está diciendo lo que crees. Esa puede ser la tasa nominal, que es diferente a la tasa efectiva anual (EA), que es lo que realmente pagas cuando se tiene en cuenta la frecuencia de los cobros.',
          'En Colombia, la ley obliga a los bancos a reportar la tasa en términos efectivos anuales (EA), pero es importante entenderla. Una tasa del 2% mensual equivale a una EA aproximada del 26.8% — no del 24% como podrías asumir multiplicando por 12. Eso se debe al efecto del interés compuesto.',
          'Al comparar créditos, siempre compara la tasa EA. Un crédito con cuota más baja puede tener una tasa más alta si tiene más plazo. Usa el simulador de deudas de Arca para comparar opciones concretas con tus números.',
        ],
        keyTakeaway: 'Siempre compara la Tasa Efectiva Anual (EA). Es el número real que define cuánto pagas.',
      },
      {
        id: 'creditos_2',
        icon: '💡',
        title: 'Abono a capital: el secreto que pocos usan',
        paragraphs: [
          'Cuando pagas la cuota normal de un crédito, una parte va a intereses y otra al capital (la deuda real). En los primeros meses de un crédito, la mayor parte de tu cuota va a intereses — muy poco reduce la deuda. Esto se llama sistema de amortización francés y es el más común en Colombia.',
          'El abono a capital es un pago adicional que va directamente a reducir la deuda, no a intereses. Si tienes un crédito de $10.000.000 y haces un abono a capital de $1.000.000, tu deuda baja a $9.000.000 inmediatamente. Eso reduce los intereses de todos los meses siguientes.',
          'El efecto es poderoso: un abono a capital en los primeros meses puede ahorrarte años de cuotas. Pídele al banco que aplique el abono "a capital con reducción de plazo" — así pagarás más rápido y ahorrarás más en intereses que si solo reducen la cuota mensual.',
        ],
        keyTakeaway: 'Abonar a capital reduce tu deuda real y puede ahorrarte meses o años de pagos.',
      },
      {
        id: 'creditos_3',
        icon: '⏩',
        title: 'Cuándo conviene prepagar un crédito',
        paragraphs: [
          'Prepagar un crédito (pagarlo antes de tiempo) casi siempre es una buena idea financieramente, pero hay que revisar los detalles. En Colombia, la ley permite el prepago de créditos de consumo y vivienda, pero algunos contratos cobran una penalidad por prepago que puede ser hasta el 1% del saldo.',
          'El prepago conviene cuando: el rendimiento de tener ese dinero invertido es menor que la tasa del crédito. Por ejemplo, si tu crédito está al 25% EA y tienes el dinero en una cuenta de ahorros al 6%, es mejor prepagar. En cambio, si tienes una inversión al 30%, puede que no convenga.',
          'Antes de prepagar, pregúntale al banco: ¿hay penalidad por prepago? ¿Cuánto es exactamente? ¿Se aplica el abono a capital o a intereses futuros? Con esa información puedes tomar la decisión correcta.',
        ],
        keyTakeaway: 'Prepaga si la tasa del crédito supera lo que ganarías invirtiendo ese dinero.',
      },
      {
        id: 'creditos_4',
        icon: '🧮',
        title: 'Cómo evaluar si un crédito vale la pena',
        paragraphs: [
          'Antes de firmar cualquier crédito, haz este análisis de 3 preguntas. Primera: ¿Para qué lo voy a usar? Si es para algo que genera valor o ingreso (educación, negocio, herramienta de trabajo), puede valer la pena. Si es para consumo puro (vacaciones, ropa, electrónica de lujo), piénsalo dos veces.',
          'Segunda: ¿Cuánto voy a pagar en total? Suma todas las cuotas del crédito. Si pides $10.000.000 a 36 meses y pagas $380.000 mensuales, terminarás pagando $13.680.000. Pregúntate si lo que vas a comprar vale $13.680.000, no $10.000.000.',
          'Tercera: ¿Qué porcentaje de mis ingresos representa la cuota? La recomendación financiera es que el total de tus cuotas de crédito no supere el 30-35% de tus ingresos netos. Si ya estás cerca de ese límite, un crédito nuevo puede comprometer seriamente tu flujo de caja.',
        ],
        keyTakeaway: 'Evalúa para qué es, cuánto pagas en total y si cabe en tu presupuesto sin comprometerte.',
      },
    ],
  },
  {
    id: 'habitos',
    title: 'Hábitos de Oro',
    description: 'Los hábitos que separan a quienes construyen patrimonio de los que no.',
    emoji: '⭐',
    color: 'emerald',
    stories: [
      {
        id: 'habitos_1',
        icon: '⚖️',
        title: 'El presupuesto 50/30/20',
        paragraphs: [
          'El método 50/30/20 es una de las reglas de presupuesto más simples y efectivas que existen. La idea es dividir tus ingresos netos (lo que recibes después de impuestos) en tres grandes categorías: 50% para necesidades, 30% para deseos y 20% para ahorro e inversión.',
          '¿Qué son necesidades? Arriendo, servicios públicos, mercado, transporte, seguros, mínimos de créditos. ¿Qué son deseos? Restaurantes, entretenimiento, ropa más allá de lo básico, viajes, suscripciones de streaming. El ahorro e inversión incluye fondo de emergencia, pensión voluntaria, inversiones.',
          'Si ganas $4.000.000 netos: $2.000.000 para necesidades, $1.200.000 para deseos y $800.000 para ahorrar. Este método no requiere llevar cuentas de cada peso — solo asegúrate de que tus gastos grandes encajen en estas proporciones.',
        ],
        keyTakeaway: '50% necesidades · 30% deseos · 20% ahorro. Simple de recordar, poderoso si lo aplicas.',
      },
      {
        id: 'habitos_2',
        icon: '🛡️',
        title: 'El fondo de emergencia: lo primero que debes tener',
        paragraphs: [
          'El fondo de emergencia es la base de cualquier plan financiero sano. Su propósito es simple: tener dinero disponible para imprevistos sin tener que endeudarte. Una reparación del carro, un gasto médico, un período de desempleo — el fondo de emergencia te protege de que cualquier imprevisto se convierta en una deuda.',
          'Lo recomendado es tener entre 3 y 6 meses de tus gastos esenciales guardados. Si tus gastos básicos son $2.500.000 al mes, tu fondo de emergencia debería estar entre $7.500.000 y $15.000.000. Si estás comenzando, empieza con una meta de $1.000.000 — lo importante es empezar.',
          'El fondo debe estar en una cuenta de ahorros de fácil acceso pero separada de tu cuenta corriente — lo suficientemente lejos para que no lo toques por impulso, pero lo suficientemente cerca para usarlo en una verdadera emergencia. CDT de 30 días o cuentas de ahorros de alto rendimiento son buenas opciones.',
        ],
        keyTakeaway: 'Sin fondo de emergencia, cualquier imprevisto se convierte en deuda. Es lo primero que se construye.',
      },
      {
        id: 'habitos_3',
        icon: '⏰',
        title: 'La regla de las 24 horas',
        paragraphs: [
          'Las compras impulsivas son uno de los principales saboteadores de las finanzas personales. El marketing está diseñado para crear urgencia y hacerte sentir que si no compras ahora, pierdes la oportunidad. La regla de las 24 horas contrarresta exactamente eso.',
          'La regla es simple: para cualquier compra no esencial mayor a cierto monto (puedes definir tu umbral, por ejemplo $150.000), espera 24 horas antes de decidir. Durante ese tiempo pregúntate: ¿Realmente lo necesito? ¿Lo seguiré queriendo en una semana? ¿Tengo el dinero sin afectar mis compromisos?',
          'Estudios muestran que la mayoría de las compras impulsivas no se realizan cuando se aplica este período de espera. El deseo pasa. Y si después de 24 horas sigues convencido de que lo necesitas y está en tu presupuesto, entonces es una decisión consciente, no impulsiva.',
        ],
        keyTakeaway: 'Para compras grandes, espera 24 horas. Si sigues queriéndola, probablemente vale la pena.',
      },
      {
        id: 'habitos_4',
        icon: '🤖',
        title: 'Automatiza tus ahorros',
        paragraphs: [
          'La forma más efectiva de ahorrar no es guardar "lo que sobra" al final del mes — porque casi nunca sobra nada. La estrategia que más funciona es pagar primero a tu futuro yo: en el momento que recibes tu ingreso, transfiere automáticamente a una cuenta de ahorros o inversión antes de gastar.',
          'Con las herramientas digitales actuales puedes programar transferencias automáticas el día de pago hacia una cuenta separada. Si tu meta es ahorrar el 20% y ganas $4.000.000, programa una transferencia automática de $800.000 el día de tu pago. Lo que no ves en tu cuenta corriente, no lo gastas.',
          'Empieza con un porcentaje pequeño si $800.000 se ve difícil. El 5% es mejor que el 0%. Lo importante es crear el hábito. Con el tiempo vas aumentando el porcentaje a medida que optimizas tus gastos y aumentas tus ingresos.',
        ],
        keyTakeaway: 'Ahorra primero, gasta después. Automatiza para que no dependa de tu fuerza de voluntad.',
      },
    ],
  },
];
