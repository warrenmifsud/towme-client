import SwiftUI

struct VisualEffectView: NSViewRepresentable {
    let material: NSVisualEffectView.Material
    let blendingMode: NSVisualEffectView.BlendingMode

    func makeNSView(context: Context) -> NSVisualEffectView {
        let visualEffectView = NSVisualEffectView()
        visualEffectView.material = material
        visualEffectView.blendingMode = blendingMode
        visualEffectView.state = .active
        return visualEffectView
    }

    func updateNSView(_ visualEffectView: NSVisualEffectView, context: Context) {
        visualEffectView.material = material
        visualEffectView.blendingMode = blendingMode
    }
}

// Modifier for easy application
extension View {
    func glassEffect(material: NSVisualEffectView.Material = .hudWindow, opacity: Double = 0.2) -> some View {
        self.background(
            VisualEffectView(material: material, blendingMode: .withinWindow)
                .opacity(opacity)
                .cornerRadius(16)
        )
    }
}
