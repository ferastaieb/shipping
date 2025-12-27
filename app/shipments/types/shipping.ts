export interface Customer {
    id: number
    name: string
    phone: string | null
    address: string
    balance: number
  }
  
  export interface PackageDetail {
    id: number
    length: number
    width: number
    height: number
    weight: number
    typeOfPackage: string
    units?: number
    costType?: string
    description?: string
    totalCost?: number
    note?: Note
  }
  
  export interface PartialShipmentItem {
    id: number
    weight: number
    origin: string
    hscode: string
    amount: number
    value: number
    priceByUnit?: number
    description?: string
    quantity?: number
    unit?: string
  }
  
  export interface Note {
    content?: string
    images?: string[]
  }
  
  export interface PartialShipment {
    id: number
    volume: number
    cost: number
    amountPaid: number
    paymentStatus?: string
    paymentResponsibility?: string
    isPaid: boolean
    receiverPhone: string | null
    receiverName: string | null
    receiverAddress: string | null
    customerId: number
    paymentCompleted: boolean
    shipmentId?: number
    customer?: Customer
    packages?: PackageDetail[]
    items?: PartialShipmentItem[]
    note?: Note
    discountAmount?: number
    extraCostAmount?: number
    extraCostReason?: string
  }
  
  export interface Shipment {
    id: number
    destination: string
    dateCreated: string
    isOpen: boolean
    totalWeight: number
    totalVolume: number
    driverName: string | null
    driverVehicle: string | null
    dateClosed: string | null
    note: Note
    partialShipments: PartialShipment[]
  }
  
  export interface Item {
    weight: number
    origin: string
    hscode: string
    amount: number
    value: number
    priceByUnit?: number
    description?: string
    quantity?: number
    unit?: string
  }
  
  export interface Package {
    weight: number
    length: number
    width: number
    height: number
    typeOfPackage: string
    units?: number
  }
  