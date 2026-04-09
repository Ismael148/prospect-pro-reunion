import { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
  fallbackMessage?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[ErrorBoundary]", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[400px] gap-4 p-8">
          <div className="p-4 rounded-full bg-destructive/10">
            <AlertTriangle className="w-8 h-8 text-destructive" />
          </div>
          <div className="text-center space-y-2">
            <h2 className="text-lg font-semibold">
              {this.props.fallbackMessage || "Une erreur est survenue"}
            </h2>
            <p className="text-sm text-muted-foreground max-w-md">
              {this.state.error?.message || "Erreur inattendue lors du chargement de la page."}
            </p>
          </div>
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => {
              this.setState({ hasError: false, error: null });
              window.location.reload();
            }}
          >
            <RefreshCw className="w-4 h-4" />
            Recharger la page
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
