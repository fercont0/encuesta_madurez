"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { StatsRingCard } from "./stats-ring-card";
import { SurveyRadarChart } from "./survey-radar-chart";
import { useSurvey } from "@/lib/context/survey-context";
import { QuestionResponse } from "@/lib/models/survey";
import { PDFDownloadLink } from '@react-pdf/renderer';
import { SurveyPDF } from './survey-pdf';
import { Download } from "lucide-react";
import ReactMarkdown from 'react-markdown';

const CATEGORIES = {
  Pilar1: {
    "Visión Digital": [
      "vision_digital_definida",
      "vision_digital_documentada",
      "revision_vision_digital",
    ],
    "Alineación Estratégica": [
      "alineacion_estrategica",
      "evaluacion_impacto_digital",
      "integracion_planeacion",
    ],
    "Technology Roadmap": [
      "roadmap_tecnologico",
      "actualizacion_roadmap",
      "uso_taxonomia_digital",
    ],
    "Curva S": [
      "momento_incorporacion_tecnologia",
      "ciclo_vida_impacto_tecnologia",
      "evaluacion_madurez_tecnologia",
    ],
    "Valor Digital (CX)": [
      "experiencia_cliente_estrategia_digital",
      "digitalizacion_propuesta_valor",
      "monitoreo_valor_digital",
    ],
  },
  Pilar2: {
    "Infraestructura Tecnológica": [
      "estado_infraestructura",
      "conectividad_redes",
      "plataformas_hardware",
    ],
    "Metodologías Digitales": [
      "presencia_metodologias_innovacion",
      "estandarizacion_enfoque_metodologico",
      "aplicacion_practica_metodologias",
    ],
    "Automatización de Procesos": [
      "impacto_automatizacion",
      "mineria_procesos",
      "porcentaje_procesos_automatizados",
      "herramientas_bajo_costo",
      "robustez_herramientas",
      "herramientas_especializadas",
    ],
    "Integración de Sistemas": [
      "nivel_integracion_sistemas",
      "flexibilidad_arquitectura",
      "fluidez_datos",
    ],
    "Tecnologías Emergentes": [
      "exploracion_tecnologias",
      "pilotos_tecnologias",
      "escalamiento_tecnologias",
    ],
  },
  Pilar3: {
    "Gobierno de Datos": [
      "politicas_gestion_datos",
      "control_acceso_datos",
      "calidad_datos",
    ],
    "Analítica de Negocio": [
      "nivel_herramientas_analitica",
      "accesibilidad_comprension_datos",
      "estructura_proceso_insights",
    ],
    "Decisiones con Datos": [
      "confianza_datos",
      "estructura_proceso_decisiones",
      "integracion_analisis_decisiones",
    ],
    "Flujo de Datos": [
      "conectividad_sistemas",
      "fluidez_intercambio_datos",
      "formalidad_arquitectura_datos",
    ],
    "Transaccionalidad": [
      "frecuencia_actualizacion_datos",
      "accesibilidad_trazabilidad_transacciones",
      "integracion_plataformas_transaccionales",
    ],
  },
  Pilar4: {
    "Liderazgo Digital": [
      "compromiso_liderazgo",
      "visibilidad_liderazgo",
      "claridad_roles_liderazgo",
    ],
    "Cultura Digital": [
      "apertura_cambio",
      "comunicacion_interna",
      "participacion_personal",
    ],
    "Talento Digital": [
      "capacitacion_habilidades",
      "evaluacion_competencias",
      "atraccion_retencion_talento",
    ],
    "Gobernanza del Cambio": [
      "estructuras_gobernanza",
      "participacion_interdepartamental",
      "metricas_objetivos_cambio",
    ],
    "Gestión del Cambio": [
      "aplicacion_metodologias",
      "comunicacion_acompanamiento",
      "medicion_impacto_humano",
    ],
  },
};

const PILAR_LABELS = {
  Pilar1: "Estrategia",
  Pilar2: "Tecnología",
  Pilar3: "Analítica de datos",
  Pilar4: "Gente y Liderazgo",
};

const MATURITY_LEVELS = {
  1: "01. Básico",
  2: "02. Inicial",
  3: "03. Intermedio",
  4: "04. Avanzado",
  5: "05. Óptimo"
};

const calculateCategoryAverages = (
  answers: Record<string, QuestionResponse>,
  categoryMap: Record<string, string[]>
) => {
  return Object.entries(categoryMap).map(([label, questionIds]) => {
    const values = questionIds
      .map((id) => answers[id])
      .filter((val): val is number => typeof val === "number");
    const avg =
      values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
    return { label, value: parseFloat(avg.toFixed(2)) };
  });
};

interface SurveyResultsProps {
  onNewSurvey: () => void;
  savedSurveyId?: string | null;
}

export function SurveyResults({ onNewSurvey, savedSurveyId }: SurveyResultsProps) {
  const { userAnswers } = useSurvey();
  const [reportText, setReportText] = useState("");
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);

  const allPilarScores = (
    ["Pilar1", "Pilar2", "Pilar3", "Pilar4"] as const
  ).map((pilar) => {
    const categories = calculateCategoryAverages(
      userAnswers,
      CATEGORIES[pilar]
    );
    return {
      name: pilar,
      average:
        categories.reduce((sum, c) => sum + c.value, 0) / categories.length,
      categories,
    };
  });

  const overallAverage =
    allPilarScores.reduce((sum, p) => sum + p.average, 0) /
    allPilarScores.length;

  // Prepare data for the main radar chart
  const mainRadarData = allPilarScores.map((pilar) => ({
    category: PILAR_LABELS[pilar.name],
    value: parseFloat(pilar.average.toFixed(2)),
  }));

  const generateReport = async () => {
    try {
      setIsGeneratingReport(true);
      const categoryResults: Record<string, Record<string, number>> = {};

      for (const pilar of allPilarScores) {
        categoryResults[PILAR_LABELS[pilar.name]] = Object.fromEntries(
          pilar.categories.map((c) => [c.label, c.value])
        );
      }

      const response = await fetch("/api/survey/generate-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...categoryResults,
          Nombre: userAnswers.Nombre,
          Empresa: userAnswers.Empresa,
          TotalScore: parseFloat(overallAverage.toFixed(2))
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || "Failed to generate report");
      }

      const data = await response.json();
      
      if (!data || typeof data.report !== 'string') {
        throw new Error("Formato de respuesta inválido");
      }

      setReportText(data.report);
    } catch (err) {
      console.error("Error al generar el reporte:", err);
      setReportText("❌ Error al generar el análisis automático. Por favor, intenta de nuevo.");
    } finally {
      setIsGeneratingReport(false);
    }
  };

  useEffect(() => {
    if (reportText === "") {
      generateReport();
    }
  }, []);

  return (
    <div className="container mx-auto p-4 space-y-6">
      {/* Success Message */}
      {savedSurveyId && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <div className="h-4 w-4 rounded-full bg-green-500"></div>
              <p className="text-green-800">
                ✅ Tu encuesta se ha guardado exitosamente (ID: {savedSurveyId.slice(-8)})
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Header */}
      <Card className="relative h-60 overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center z-0"
          style={{
            backgroundImage: `url('/london_digital.png')`,
          }}
        ></div>
      </Card>
      <div className="relative z-10 h-full flex items-center justify-center pb-2">
        <div className="text-center">
          <h2 className="text-4xl font-bold text-foreground mb-2">
            Resultados de Madurez Digital
          </h2>
          {userAnswers.Nombre && (
            <p className="text-center text-lg text-foreground/90">
              {userAnswers.Nombre} - {userAnswers.Empresa}
            </p>
          )}
        </div>
      </div>

      <Tabs defaultValue="resumen" className="w-full">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
          <TabsTrigger value="resumen" className="text-sm sm:text-base">Resumen</TabsTrigger>
          <TabsTrigger value="analisis" className="text-sm sm:text-base">Análisis</TabsTrigger>
          <TabsTrigger value="estrategia" className="text-sm sm:text-base">1. Estrategia</TabsTrigger>
          <TabsTrigger value="tecnologia" className="text-sm sm:text-base">2. Tecnología</TabsTrigger>
          <TabsTrigger value="analitica" className="text-sm sm:text-base">3. Analítica</TabsTrigger>
          <TabsTrigger value="gente" className="text-sm sm:text-base">4. Gente</TabsTrigger>
        </TabsList>

        <TabsContent value="resumen" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Resumen General</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Stats Cards */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <StatsRingCard
                    label="Madurez Digital"
                    value={overallAverage}
                    size="default"
                  />
                  {allPilarScores.map((pilar, idx) => (
                    <StatsRingCard
                      key={idx}
                      label={`${idx + 1}. ${PILAR_LABELS[pilar.name]}`}
                      value={pilar.average}
                      size="default"
                    />
                  ))}
                </div>

                {/* Main Radar Chart */}
                <div className="flex justify-center">
                  <SurveyRadarChart
                    data={mainRadarData}
                    title="Vista General"
                    description="Comparación de los 4 pilares de madurez digital"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analisis" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Análisis con IA</CardTitle>
            </CardHeader>
            <CardContent>
              {isGeneratingReport ? (
                <div className="flex items-center justify-center p-8">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                    <p>Generando análisis personalizado...</p>
                  </div>
                </div>
              ) : (
                <div className="prose prose-lg max-w-none dark:prose-invert">
                  <ReactMarkdown
                    components={{
                      h1: ({node, ...props}) => (
                        <h1 className="text-2xl font-bold mt-8 mb-4 text-primary" {...props} />
                      ),
                      h2: ({node, ...props}) => (
                        <h2 className="text-xl font-bold mt-6 mb-3 text-primary" {...props} />
                      ),
                      h3: ({node, ...props}) => (
                        <h3 className="text-lg font-semibold mt-5 mb-2 text-primary" {...props} />
                      ),
                      p: ({node, ...props}) => (
                        <p className="mb-4 leading-relaxed" {...props} />
                      ),
                      ul: ({node, ...props}) => (
                        <ul className="list-disc pl-6 mb-4" {...props} />
                      ),
                      ol: ({node, ...props}) => (
                        <ol className="list-decimal pl-6 mb-4" {...props} />
                      ),
                      li: ({node, ...props}) => (
                        <li className="mb-2" {...props} />
                      ),
                      strong: ({node, ...props}) => (
                        <strong className="text-primary font-semibold" {...props} />
                      ),
                      a: ({node, ...props}) => (
                        <a className="text-primary underline hover:text-primary/80 transition-colors" target="_blank" rel="noopener noreferrer" {...props} />
                      ),
                    }}
                  >
                    {reportText}
                  </ReactMarkdown>
                </div>
              )}
              <div className="mt-6 flex flex-col sm:flex-row gap-4">
                {isGeneratingReport ? (
                  <Button 
                    size="lg"
                    className="gap-2 w-full sm:w-auto"
                    disabled
                  >
                    <Download className="w-4 h-4" />
                    Generando reporte...
                  </Button>
                ) : (
                  <PDFDownloadLink
                    document={
                      <SurveyPDF
                        data={allPilarScores.map(pilar => ({
                          pilarName: PILAR_LABELS[pilar.name],
                          average: pilar.average,
                          categories: pilar.categories.map(cat => ({
                            label: cat.label,
                            value: cat.value
                          }))
                        }))}
                        reportText={reportText.replace(/<[^>]*>/g, '')}
                        companyName={userAnswers.Empresa?.toString()}
                        userName={userAnswers.Nombre?.toString()}
                      />
                    }
                    fileName="reporte-madurez-digital.pdf"
                  >
                    {({ blob, url, loading, error }) => (
                      <Button 
                        size="lg"
                        className="gap-2 w-full sm:w-auto"
                        disabled={loading || !reportText}
                      >
                        <Download className="w-4 h-4" />
                        {loading ? 'Generando PDF...' : 'Descargar PDF'}
                      </Button>
                    )}
                  </PDFDownloadLink>
                )}
                <Button 
                  onClick={onNewSurvey} 
                  variant="outline"
                  className="w-full sm:w-auto"
                >
                  Nueva Encuesta
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Individual Pilar Tabs */}
        {allPilarScores.map((pilar, idx) => {
          const tabValue =
            pilar.name === "Pilar1"
              ? "estrategia"
              : pilar.name === "Pilar2"
              ? "tecnologia"
              : pilar.name === "Pilar3"
              ? "analitica"
              : "gente";

          const radarData = pilar.categories.map((cat) => ({
            category: cat.label,
            value: cat.value,
          }));

          return (
            <TabsContent key={idx} value={tabValue} className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>{PILAR_LABELS[pilar.name]}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="flex justify-center items-start">
                      <StatsRingCard
                        label={`${idx + 1}. ${PILAR_LABELS[pilar.name]}`}
                        value={pilar.average}
                        size="large"
                      />
                    </div>
                    <div className="flex justify-center">
                      <SurveyRadarChart
                        data={radarData}
                        title={PILAR_LABELS[pilar.name]}
                        description={`Análisis detallado de ${PILAR_LABELS[
                          pilar.name
                        ].toLowerCase()}`}
                      />
                    </div>
                  </div>

                  {/* Category Breakdown */}
                  <div className="mt-6">
                    <h4 className="text-lg font-semibold mb-4">
                      Desglose por Categoría
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {pilar.categories.map((category, catIdx) => (
                        <Card key={catIdx} className="p-4">
                          <h5 className="font-medium text-sm mb-2 flex items-start gap-2">
                            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs">
                              {catIdx + 1}
                            </span>
                            <span className="flex-1">
                            {category.label}
                            </span>
                          </h5>
                          <div className="flex items-center justify-between pl-8">
                            <span className="text-2xl font-bold">
                              {category.value.toFixed(1)}
                            </span>
                            <span className="text-sm text-muted-foreground">
                              {((category.value / 5) * 100).toFixed(0)}%
                            </span>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
}
