import Link from "next/link";
import { Car, FileText, Building2 } from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface TramiteOption {
  title: string;
  description: string;
  icon: React.ReactNode;
  href: string | null;
  enabled: boolean;
}

const tramiteOptions: TramiteOption[] = [
  {
    title: "Compraventa de vehículo motorizado",
    description:
      "Genera el contrato de compraventa con validación automática de documentos del vehículo.",
    icon: <Car className="size-8 text-brand" data-icon="car" />,
    href: "/tramite/compraventa-vehiculo",
    enabled: true,
  },
  {
    title: "Poder notarial",
    description:
      "Otorgamiento de poder amplio o especial ante notario público.",
    icon: <FileText className="size-8 text-muted-foreground" data-icon="file-text" />,
    href: null,
    enabled: false,
  },
  {
    title: "Constitución de sociedad",
    description:
      "Escritura pública de constitución de sociedad de responsabilidad limitada.",
    icon: <Building2 className="size-8 text-muted-foreground" data-icon="building" />,
    href: null,
    enabled: false,
  },
];

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4 py-12">
      <div className="mb-10 text-center animate-fade-in-up">
        <h1 className="text-3xl font-bold tracking-tight text-brand sm:text-4xl">
          NotaryFlow
        </h1>
        <p className="mt-2 text-muted-foreground">
          Plataforma inteligente de gestión notarial
        </p>
      </div>

      <div className="grid w-full max-w-3xl gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {tramiteOptions.map((option, index) => {
          const delay = `${index * 80}ms`;

          if (option.enabled && option.href) {
            return (
              <Link
                key={option.title}
                href={option.href}
                className="block animate-fade-in-up"
                style={{ animationDelay: delay }}
              >
                <Card className="h-full cursor-pointer transition-shadow hover:ring-2 hover:ring-brand/30">
                  <CardHeader>
                    <div className="mb-1">{option.icon}</div>
                    <CardTitle>{option.title}</CardTitle>
                    <CardDescription>{option.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Badge variant="default">Disponible</Badge>
                  </CardContent>
                </Card>
              </Link>
            );
          }

          return (
            <div
              key={option.title}
              className="animate-fade-in-up"
              style={{ animationDelay: delay }}
            >
              <Card className="h-full opacity-60">
                <CardHeader>
                  <div className="mb-1">{option.icon}</div>
                  <CardTitle>{option.title}</CardTitle>
                  <CardDescription>{option.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Badge variant="secondary">Próximamente</Badge>
                </CardContent>
              </Card>
            </div>
          );
        })}
      </div>
    </main>
  );
}
