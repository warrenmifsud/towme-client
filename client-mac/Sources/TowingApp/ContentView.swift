import SwiftUI

struct ContentView: View {
    @State private var selectedTab: Int = 0
    
    var body: some View {
        HStack(spacing: 0) {
            // Sidebar
            VStack(spacing: 20) {
                Image(systemName: "car.fill")
                    .font(.system(size: 30))
                    .foregroundStyle(.white)
                    .padding(.top, 40)
                    .shadow(radius: 10)
                
                Spacer()
                
                SidebarButton(icon: "map.fill", title: "Request", isSelected: selectedTab == 0) {
                    selectedTab = 0
                }
                
                SidebarButton(icon: "clock.fill", title: "History", isSelected: selectedTab == 1) {
                    selectedTab = 1
                }
                
                SidebarButton(icon: "gearshape.fill", title: "Settings", isSelected: selectedTab == 2) {
                    selectedTab = 2
                }
                
                Spacer()
            }
            .frame(width: 80)
            .background(VisualEffectView(material: .sidebar, blendingMode: .behindWindow))
            
            // Content Area
            ZStack {
                Color.black.opacity(0.3)
                
                if selectedTab == 0 {
                    ServiceSelectionView()
                } else {
                    Text("Coming Soon")
                        .font(.largeTitle)
                        .foregroundStyle(.white.opacity(0.5))
                }
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
        }
        .edgesIgnoringSafeArea(.all)
    }
}

struct SidebarButton: View {
    let icon: String
    let title: String
    let isSelected: Bool
    let action: () -> Void
    
    var body: some View {
        Button(action: action) {
            VStack(spacing: 5) {
                Image(systemName: icon)
                    .font(.system(size: 20))
                Text(title)
                    .font(.caption)
            }
            .frame(width: 60, height: 60)
            .background(isSelected ? Color.white.opacity(0.2) : Color.clear)
            .cornerRadius(12)
            .foregroundStyle(isSelected ? .white : .gray)
        }
        .buttonStyle(.plain)
    }
}

struct ServiceSelectionView: View {
    let services = [
        ServiceItem(name: "Standard Tow", price: "From $150", icon: "car.side.fill"),
        ServiceItem(name: "Flatbed", price: "From $200", icon: "truck.box.fill"),
        ServiceItem(name: "Battery Jump", price: "$50", icon: "bolt.car.fill")
    ]
    
    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                Text("Select Service")
                    .font(.largeTitle)
                    .fontWeight(.bold)
                    .foregroundStyle(.white)
                    .padding(.top, 40)
                
                LazyVGrid(columns: [GridItem(.adaptive(minimum: 200))], spacing: 20) {
                    ForEach(services) { service in
                        VStack(spacing: 15) {
                            Image(systemName: service.icon)
                                .font(.system(size: 40))
                                .foregroundStyle(.blue)
                                .shadow(color: .blue.opacity(0.5), radius: 10)
                            
                            Text(service.name)
                                .font(.headline)
                                .foregroundStyle(.white)
                            
                            Text(service.price)
                                .font(.subheadline)
                                .foregroundStyle(.gray)
                        }
                        .frame(height: 180)
                        .frame(maxWidth: .infinity)
                        .glassEffect(material: .hudWindow, opacity: 0.1)
                    }
                }
            }
            .padding(30)
        }
    }
}

struct ServiceItem: Identifiable {
    let id = UUID()
    let name: String
    let price: String
    let icon: String
}
