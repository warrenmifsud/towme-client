import SwiftUI

@main
struct TowingApp: App {
    var body: some Scene {
        WindowGroup {
            ContentView()
                .frame(minWidth: 800, minHeight: 600)
                .background(VisualEffectView(material: .underWindowBackground, blendingMode: .behindWindow))
        }
        .windowStyle(.hiddenTitleBar)
    }
}
