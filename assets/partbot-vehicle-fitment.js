class PartbotVehicleFitment extends HTMLElement {
  constructor() {
    super();
    this.initialize();
    if (this.isValid()) {
      this.processSelectedVehicle();
      this.renderFitment();
    }
  }

  initialize() {
    this.vehicleIds = this.parseVehicleIds();
    this.vehicleYears = this.parseVehicleYears();
    this.vehicleDescription = this.querySelectorAll('.js-vehicle-description');
    this.selectedVehicle = this.getSelectedVehicle();
  }

  isValid() {
    return this.vehicleIds?.length > 0 && this.selectedVehicle;
  }

  parseVehicleIds() {
    return this.dataset.vehicleIds?.split(',').filter(Boolean) ?? [];
  }

  parseVehicleYears() {
    try {
      return JSON.parse(this.dataset.vehicleYears);
    } catch (error) {
      return null;
    }
  }

  getSelectedVehicle() {
    try {
      return JSON.parse(localStorage.getItem('partbot_selected_vehicle'));
    } catch (error) {
      return null;
    }
  }

  processSelectedVehicle() {
    this.selectedVehicleYear = this.selectedVehicle.vehicle.year;
    this.selectedVehicleIds = this.selectedVehicle.vehicle_ids ?? [];
    this.updateVehicleDescription();
    this.fitsVehicle = this.isYearCovered(this.selectedVehicleYear, this.selectedVehicleIds);
  }

  updateVehicleDescription() {
    this.vehicleDescription.forEach((el) => {
      el.textContent = this.selectedVehicle.description;
    });
  }

  isYearCovered(year, vehicleIds) {
    if (!this.vehicleYears) return false;
    const { year_from: yearFrom, year_to: yearTo } = this.vehicleYears;
    const yearRanges = this.preprocessYearRanges(yearFrom, yearTo);

    return yearRanges.some(
      ([start, end, fromIds, toIds]) =>
        year >= start &&
        year <= end &&
        vehicleIds.some((id) => fromIds.includes(id) || toIds.includes(id))
    );
  }

  preprocessYearRanges(yearFrom = {}, yearTo = {}) {
    return Object.entries(yearFrom).flatMap(([start, fromIds]) =>
      Object.entries(yearTo).map(([end, toIds]) => [
        parseInt(start, 10),
        parseInt(end, 10),
        fromIds || [],
        toIds || [],
      ])
    );
  }

  renderFitment() {
    const container = document.createElement('div');
    container.className = `partbot-fitment ${
      this.fitsVehicle ? 'partbot-fitment--yes' : 'partbot-fitment--no'
    }`;

    const badge = document.createElement('span');
    badge.className = 'partbot-fitment__badge';
    badge.textContent = this.fitsVehicle ? 'Fits' : 'Does not fit';

    const text = document.createElement('span');
    text.className = 'partbot-fitment__text';
    text.append(
      document.createTextNode(
        this.fitsVehicle ? 'This part fits your vehicle: ' : 'This part does not fit your vehicle: '
      )
    );

    const description = document.createElement('strong');
    description.className = 'js-vehicle-description';
    description.textContent = this.selectedVehicle.description;
    text.append(description);

    container.append(badge, text);
    this.appendChild(container);
    this.classList.remove('is-hidden');
  }
}

customElements.define('partbot-vehicle-fitment', PartbotVehicleFitment);
