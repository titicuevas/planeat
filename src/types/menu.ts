export interface MenuPlan {
    semana: {
      [key: string]: {
        desayuno: string;
        almuerzo: string;
        cena: string;
        snacks: string[];
      };
    };
    recomendaciones: string[];
  }