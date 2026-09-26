package expo.modules.floatingbubble

import android.content.Intent
import android.net.Uri
import android.provider.Settings
import expo.modules.kotlin.functions.Queues
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/**
 * Rapido/Uber-style floating bubble: a draggable RYNO head drawn over other
 * apps while the driver is online. Tapping the bubble expands a floating
 * requests and trips list right over other apps.
 */
class FloatingBubbleModule : Module() {
  private val context
    get() = requireNotNull(appContext.reactContext) { "React context is not available" }

  private var bubble: BubbleView? = null

  override fun definition() = ModuleDefinition {
    Name("FloatingBubble")

    Function("canDrawOverlays") {
      Settings.canDrawOverlays(context)
    }

    /** Opens the system "Display over other apps" screen for this app. */
    Function("openOverlaySettings") {
      val intent = Intent(
        Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
        Uri.parse("package:${context.packageName}"),
      ).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      context.startActivity(intent)
    }

    /** Legacy show function */
    AsyncFunction("show") { title: String, subtitle: String, deepLink: String, highlight: Boolean ->
      if (!Settings.canDrawOverlays(context)) return@AsyncFunction false
      val view = bubble ?: BubbleView(context.applicationContext) { link -> openLink(link) }
        .also { bubble = it }
      view.updateLegacy(title, subtitle, deepLink, highlight)
      view.attach()
      true
    }.runOnQueue(Queues.MAIN)

    /** Updates the full overlay state with requests list, active delivery, etc. */
    AsyncFunction("updateOverlay") { dataJson: String ->
      if (!Settings.canDrawOverlays(context)) return@AsyncFunction false
      val view = bubble ?: BubbleView(context.applicationContext) { link -> openLink(link) }
        .also { bubble = it }
      view.updateData(dataJson)
      view.attach()
      true
    }.runOnQueue(Queues.MAIN)

    AsyncFunction("hide") {
      bubble?.detach()
      Unit
    }.runOnQueue(Queues.MAIN)

    /**
     * Brings the app to the front on a deep link (e.g. driver explicitly requested it).
     */
    Function("bringToFront") { deepLink: String ->
      if (!Settings.canDrawOverlays(context)) return@Function false
      openLink(deepLink)
      true
    }

    OnDestroy {
      bubble?.detach()
      bubble = null
    }
  }

  private fun openLink(deepLink: String) {
    val intent = Intent(Intent.ACTION_VIEW, Uri.parse(deepLink))
      .setPackage(context.packageName)
      .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP)
    context.startActivity(intent)
  }
}
