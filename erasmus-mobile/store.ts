let selectedItem: any | null = null;

export const setItem = (item: any) => {
  selectedItem = item;
};

export const getItem = () => selectedItem;